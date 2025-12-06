# OneCDetector - Примеры использования

## C# (уже реализовано в проекте)

```csharp
using OneCUpdaterAgent;

var detector = new OneCDetector();
var installation = detector.GetLatestInstallation();

if (installation != null)
{
    Console.WriteLine($"Версия: {installation.Version}");
    Console.WriteLine($"Путь: {installation.Path}");
    Console.WriteLine($"Архитектура: {installation.Edition}");
}
else
{
    Console.WriteLine("1С не установлена");
}
```

## Python

```python
import winreg
import os
from pathlib import Path
from typing import Optional, Dict, List, Tuple

def parse_version(version: str) -> Tuple[int, ...]:
    """Парсит версию для сравнения (например, '8.3.22.1922' -> (8, 3, 22, 1922))"""
    try:
        return tuple(int(v) for v in version.split('.'))
    except:
        return (0, 0, 0, 0)

def is_onec_installation(display_name: str) -> bool:
    """Проверяет, является ли установка 1С:Предприятие"""
    if not display_name:
        return False
    name_lower = display_name.lower()
    return (
        '1с:предприятие' in name_lower or
        '1c:enterprise' in name_lower or
        '1c:предприятие' in name_lower or
        ('1c' in name_lower and ('предприятие' in name_lower or 'enterprise' in name_lower))
    )

def determine_architecture(install_path: str, is_wow64: bool) -> str:
    """Определяет архитектуру установки"""
    if not install_path:
        return 'x86' if is_wow64 else 'x64'
    
    try:
        bin_path = os.path.join(install_path, 'bin', '1cv8.exe')
        if os.path.exists(bin_path):
            program_files_64 = os.environ.get('ProgramFiles', '')
            program_files_32 = os.environ.get('ProgramFiles(x86)', '')
            
            if install_path.startswith(program_files_64) and not install_path.startswith(program_files_32):
                return 'x64'
            elif install_path.startswith(program_files_32):
                return 'x86'
    except:
        pass
    
    return 'x86' if is_wow64 else 'x64'

def scan_uninstall_registry(hive, key_path: str) -> List[Dict]:
    """Сканирует раздел Uninstall в реестре"""
    installations = []
    
    try:
        with winreg.OpenKey(hive, key_path) as uninstall_key:
            i = 0
            while True:
                try:
                    subkey_name = winreg.EnumKey(uninstall_key, i)
                    with winreg.OpenKey(uninstall_key, subkey_name) as subkey:
                        try:
                            display_name = winreg.QueryValueEx(subkey, 'DisplayName')[0]
                            if not is_onec_installation(display_name):
                                i += 1
                                continue
                            
                            version = winreg.QueryValueEx(subkey, 'DisplayVersion')[0]
                            install_location = winreg.QueryValueEx(subkey, 'InstallLocation')[0]
                            
                            if not install_location:
                                uninstall_string = winreg.QueryValueEx(subkey, 'UninstallString')[0]
                                if uninstall_string:
                                    # Извлекаем путь из строки вида "C:\Program Files\1cv8\...\uninstall.exe" /S
                                    import re
                                    match = re.match(r'^"?([^"]+\\bin\\)', uninstall_string)
                                    if match:
                                        install_location = os.path.dirname(os.path.dirname(match.group(1)))
                            
                            is_wow64 = 'WOW6432Node' in key_path
                            edition = determine_architecture(install_location, is_wow64)
                            
                            if version and install_location:
                                installations.append({
                                    'version': version,
                                    'path': install_location,
                                    'edition': edition
                                })
                        except (FileNotFoundError, OSError):
                            pass
                    i += 1
                except OSError:
                    break
    except (FileNotFoundError, OSError):
        pass
    
    return installations

def scan_onec_registry(hive, key_path: str, default_edition: str) -> List[Dict]:
    """Сканирует раздел 1C\1Cv8 в реестре"""
    installations = []
    
    try:
        with winreg.OpenKey(hive, key_path) as onec_key:
            # Проверяем корневой ключ
            try:
                root_version = winreg.QueryValueEx(onec_key, 'version')[0]
                try:
                    root_path = winreg.QueryValueEx(onec_key, 'InstallPath')[0]
                except FileNotFoundError:
                    root_path = winreg.QueryValueEx(onec_key, 'Path')[0]
                
                if root_version and root_path:
                    edition = determine_architecture(root_path, default_edition == 'x86')
                    installations.append({
                        'version': root_version,
                        'path': root_path,
                        'edition': edition
                    })
            except (FileNotFoundError, OSError):
                pass
            
            # Проверяем подразделы
            i = 0
            while True:
                try:
                    subkey_name = winreg.EnumKey(onec_key, i)
                    with winreg.OpenKey(onec_key, subkey_name) as subkey:
                        try:
                            version = winreg.QueryValueEx(subkey, 'version')[0]
                        except FileNotFoundError:
                            version = subkey_name
                        
                        try:
                            path = winreg.QueryValueEx(subkey, 'InstallPath')[0]
                        except FileNotFoundError:
                            try:
                                path = winreg.QueryValueEx(subkey, 'Path')[0]
                            except FileNotFoundError:
                                try:
                                    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path) as root:
                                        path = winreg.QueryValueEx(root, 'InstallPath')[0]
                                except:
                                    path = None
                        
                        if version and path:
                            edition = determine_architecture(path, default_edition == 'x86')
                            installations.append({
                                'version': version,
                                'path': path,
                                'edition': edition
                            })
                    i += 1
                except OSError:
                    break
    except (FileNotFoundError, OSError):
        pass
    
    return installations

def get_latest_installation() -> Optional[Dict]:
    """Определяет последнюю установленную версию 1С:Предприятие"""
    all_installations = []
    
    # 1. HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall
    all_installations.extend(scan_uninstall_registry(
        winreg.HKEY_LOCAL_MACHINE,
        r'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall'
    ))
    
    # 2. HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall
    all_installations.extend(scan_uninstall_registry(
        winreg.HKEY_LOCAL_MACHINE,
        r'SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'
    ))
    
    # 3. HKLM\SOFTWARE\1C\1Cv8
    all_installations.extend(scan_onec_registry(
        winreg.HKEY_LOCAL_MACHINE,
        r'SOFTWARE\1C\1Cv8',
        'x64'
    ))
    
    # 4. HKLM\SOFTWARE\WOW6432Node\1C\1Cv8
    all_installations.extend(scan_onec_registry(
        winreg.HKEY_LOCAL_MACHINE,
        r'SOFTWARE\WOW6432Node\1C\1Cv8',
        'x86'
    ))
    
    # Фильтруем валидные установки
    valid_installations = [
        inst for inst in all_installations
        if inst.get('version') and inst.get('path')
    ]
    
    if not valid_installations:
        return None
    
    # Определяем самую новую версию
    latest = max(
        valid_installations,
        key=lambda inst: (
            parse_version(inst['version']),
            inst['edition'] == 'x64'  # Предпочитаем x64
        )
    )
    
    return latest

# Пример использования
if __name__ == '__main__':
    installation = get_latest_installation()
    if installation:
        print(f"Версия: {installation['version']}")
        print(f"Путь: {installation['path']}")
        print(f"Архитектура: {installation['edition']}")
    else:
        print("1С не установлена")
```

## PowerShell

```powershell
function Get-OneCVersion {
    <#
    .SYNOPSIS
    Определяет последнюю установленную версию 1С:Предприятие
    
    .OUTPUTS
    PSCustomObject с полями Version, Path, Edition или $null
    #>
    
    $allInstallations = @()
    
    # Функция для парсинга версии
    function Parse-Version {
        param([string]$Version)
        try {
            return $Version -split '\.' | ForEach-Object { [int]$_ }
        } catch {
            return @(0, 0, 0, 0)
        }
    }
    
    # Функция для проверки, является ли установка 1С
    function Test-OneCInstallation {
        param([string]$DisplayName)
        if ([string]::IsNullOrEmpty($DisplayName)) { return $false }
        $name = $DisplayName.ToLower()
        return ($name -like '*1с:предприятие*' -or 
                $name -like '*1c:enterprise*' -or 
                $name -like '*1c:предприятие*' -or
                ($name -like '*1c*' -and ($name -like '*предприятие*' -or $name -like '*enterprise*')))
    }
    
    # Функция для определения архитектуры
    function Get-Architecture {
        param(
            [string]$InstallPath,
            [bool]$IsWOW64
        )
        if ([string]::IsNullOrEmpty($InstallPath)) {
            return if ($IsWOW64) { 'x86' } else { 'x64' }
        }
        
        $binPath = Join-Path $InstallPath 'bin\1cv8.exe'
        if (Test-Path $binPath) {
            $programFiles64 = $env:ProgramFiles
            $programFiles32 = ${env:ProgramFiles(x86)}
            
            if ($InstallPath -like "$programFiles64*" -and $InstallPath -notlike "$programFiles32*") {
                return 'x64'
            } elseif ($InstallPath -like "$programFiles32*") {
                return 'x86'
            }
        }
        
        return if ($IsWOW64) { 'x86' } else { 'x64' }
    }
    
    # 1. Сканирование HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall
    try {
        $uninstallKey = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall'
        Get-ChildItem -Path $uninstallKey -ErrorAction SilentlyContinue | ForEach-Object {
            $displayName = (Get-ItemProperty -Path $_.PSPath -Name DisplayName -ErrorAction SilentlyContinue).DisplayName
            if (Test-OneCInstallation $displayName) {
                $version = (Get-ItemProperty -Path $_.PSPath -Name DisplayVersion -ErrorAction SilentlyContinue).DisplayVersion
                $installLocation = (Get-ItemProperty -Path $_.PSPath -Name InstallLocation -ErrorAction SilentlyContinue).InstallLocation
                
                if (-not $installLocation) {
                    $uninstallString = (Get-ItemProperty -Path $_.PSPath -Name UninstallString -ErrorAction SilentlyContinue).UninstallString
                    if ($uninstallString -match '^"?([^"]+\\bin\\)') {
                        $installLocation = Split-Path (Split-Path $matches[1])
                    }
                }
                
                $edition = Get-Architecture $installLocation $false
                if ($version -and $installLocation) {
                    $allInstallations += [PSCustomObject]@{
                        Version = $version
                        Path = $installLocation
                        Edition = $edition
                    }
                }
            }
        }
    } catch { }
    
    # 2. Сканирование HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall
    try {
        $uninstallKey = 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'
        Get-ChildItem -Path $uninstallKey -ErrorAction SilentlyContinue | ForEach-Object {
            $displayName = (Get-ItemProperty -Path $_.PSPath -Name DisplayName -ErrorAction SilentlyContinue).DisplayName
            if (Test-OneCInstallation $displayName) {
                $version = (Get-ItemProperty -Path $_.PSPath -Name DisplayVersion -ErrorAction SilentlyContinue).DisplayVersion
                $installLocation = (Get-ItemProperty -Path $_.PSPath -Name InstallLocation -ErrorAction SilentlyContinue).InstallLocation
                
                if (-not $installLocation) {
                    $uninstallString = (Get-ItemProperty -Path $_.PSPath -Name UninstallString -ErrorAction SilentlyContinue).UninstallString
                    if ($uninstallString -match '^"?([^"]+\\bin\\)') {
                        $installLocation = Split-Path (Split-Path $matches[1])
                    }
                }
                
                $edition = Get-Architecture $installLocation $true
                if ($version -and $installLocation) {
                    $allInstallations += [PSCustomObject]@{
                        Version = $version
                        Path = $installLocation
                        Edition = $edition
                    }
                }
            }
        }
    } catch { }
    
    # 3. Сканирование HKLM\SOFTWARE\1C\1Cv8
    try {
        $onecKey = 'HKLM:\SOFTWARE\1C\1Cv8'
        if (Test-Path $onecKey) {
            $rootVersion = (Get-ItemProperty -Path $onecKey -Name version -ErrorAction SilentlyContinue).version
            $rootPath = (Get-ItemProperty -Path $onecKey -Name InstallPath -ErrorAction SilentlyContinue).InstallPath
            if (-not $rootPath) {
                $rootPath = (Get-ItemProperty -Path $onecKey -Name Path -ErrorAction SilentlyContinue).Path
            }
            
            if ($rootVersion -and $rootPath) {
                $edition = Get-Architecture $rootPath $false
                $allInstallations += [PSCustomObject]@{
                    Version = $rootVersion
                    Path = $rootPath
                    Edition = $edition
                }
            }
            
            Get-ChildItem -Path $onecKey -ErrorAction SilentlyContinue | ForEach-Object {
                $version = (Get-ItemProperty -Path $_.PSPath -Name version -ErrorAction SilentlyContinue).version
                if (-not $version) { $version = $_.PSChildName }
                
                $path = (Get-ItemProperty -Path $_.PSPath -Name InstallPath -ErrorAction SilentlyContinue).InstallPath
                if (-not $path) {
                    $path = (Get-ItemProperty -Path $_.PSPath -Name Path -ErrorAction SilentlyContinue).Path
                }
                if (-not $path) { $path = $rootPath }
                
                if ($version -and $path) {
                    $edition = Get-Architecture $path $false
                    $allInstallations += [PSCustomObject]@{
                        Version = $version
                        Path = $path
                        Edition = $edition
                    }
                }
            }
        }
    } catch { }
    
    # 4. Сканирование HKLM\SOFTWARE\WOW6432Node\1C\1Cv8
    try {
        $onecKey = 'HKLM:\SOFTWARE\WOW6432Node\1C\1Cv8'
        if (Test-Path $onecKey) {
            $rootVersion = (Get-ItemProperty -Path $onecKey -Name version -ErrorAction SilentlyContinue).version
            $rootPath = (Get-ItemProperty -Path $onecKey -Name InstallPath -ErrorAction SilentlyContinue).InstallPath
            if (-not $rootPath) {
                $rootPath = (Get-ItemProperty -Path $onecKey -Name Path -ErrorAction SilentlyContinue).Path
            }
            
            if ($rootVersion -and $rootPath) {
                $edition = Get-Architecture $rootPath $true
                $allInstallations += [PSCustomObject]@{
                    Version = $rootVersion
                    Path = $rootPath
                    Edition = $edition
                }
            }
            
            Get-ChildItem -Path $onecKey -ErrorAction SilentlyContinue | ForEach-Object {
                $version = (Get-ItemProperty -Path $_.PSPath -Name version -ErrorAction SilentlyContinue).version
                if (-not $version) { $version = $_.PSChildName }
                
                $path = (Get-ItemProperty -Path $_.PSPath -Name InstallPath -ErrorAction SilentlyContinue).InstallPath
                if (-not $path) {
                    $path = (Get-ItemProperty -Path $_.PSPath -Name Path -ErrorAction SilentlyContinue).Path
                }
                if (-not $path) { $path = $rootPath }
                
                if ($version -and $path) {
                    $edition = Get-Architecture $path $true
                    $allInstallations += [PSCustomObject]@{
                        Version = $version
                        Path = $path
                        Edition = $edition
                    }
                }
            }
        }
    } catch { }
    
    # Фильтруем валидные установки
    $validInstallations = $allInstallations | Where-Object { $_.Version -and $_.Path }
    
    if ($validInstallations.Count -eq 0) {
        return $null
    }
    
    # Определяем самую новую версию
    $latest = $validInstallations | Sort-Object {
        $versionParts = Parse-Version $_.Version
        [PSCustomObject]@{
            Version = $versionParts
            IsX64 = ($_.Edition -eq 'x64')
        }
    } -Descending | Select-Object -First 1
    
    return $latest
}

# Пример использования
$installation = Get-OneCVersion
if ($installation) {
    Write-Host "Версия: $($installation.Version)"
    Write-Host "Путь: $($installation.Path)"
    Write-Host "Архитектура: $($installation.Edition)"
} else {
    Write-Host "1С не установлена"
}
```

## Объяснение

### Алгоритм работы:

1. **Сканирование реестра** в 4 местах:
   - `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall` - стандартные установки (64-bit)
   - `HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall` - 32-bit установки на 64-bit системе
   - `HKLM\SOFTWARE\1C\1Cv8` - нативные ключи 1С (64-bit)
   - `HKLM\SOFTWARE\WOW6432Node\1C\1Cv8` - нативные ключи 1С (32-bit)

2. **Определение архитектуры**:
   - Проверка пути установки (Program Files vs Program Files (x86))
   - Проверка наличия исполняемых файлов
   - Анализ WOW64 флага

3. **Сравнение версий**:
   - Парсинг версии в числовой массив (8.3.22.1922 → [8, 3, 22, 1922])
   - Сортировка по убыванию версии
   - Предпочтение x64 версиям при одинаковой версии

4. **Возврат результата**:
   - Структурированный объект с версией, путем и архитектурой
   - `null` если 1С не установлена

### Преимущества:

- ✅ Поддержка обеих архитектур
- ✅ Проверка всех возможных мест установки
- ✅ Корректное сравнение версий
- ✅ Определение архитектуры по нескольким признакам
- ✅ Обработка ошибок и edge cases

