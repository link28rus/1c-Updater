using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Microsoft.Win32;

namespace OneCUpdaterAgent
{
    /// <summary>
    /// Результат определения установки 1С:Предприятие
    /// </summary>
    public class OneCInstallationInfo
    {
        public string Version { get; set; } = string.Empty;
        public string Path { get; set; } = string.Empty;
        public string Edition { get; set; } = "x86"; // "x64" | "x86"
    }

    /// <summary>
    /// Класс для определения последней установленной версии 1С:Предприятие
    /// </summary>
    public class OneCDetector
    {
        /// <summary>
        /// Определяет последнюю установленную версию 1С:Предприятие
        /// </summary>
        /// <returns>Информация об установке или null, если 1С не установлена</returns>
        public OneCInstallationInfo? GetLatestInstallation()
        {
            var allInstallations = new List<OneCInstallationInfo>();

            try
            {
                System.Diagnostics.Debug.WriteLine("[OneCDetector] Начало поиска установок 1С...");

                // 1. Проверка через HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall
                var uninstallKey1 = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall");
                if (uninstallKey1 != null)
                {
                    var found1 = ScanUninstallRegistry(uninstallKey1);
                    allInstallations.AddRange(found1);
                    System.Diagnostics.Debug.WriteLine($"[OneCDetector] Uninstall (64-bit): найдено {found1.Count} установок");
                }

                // 2. Проверка через HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall
                var uninstallKey2 = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall");
                if (uninstallKey2 != null)
                {
                    var found2 = ScanUninstallRegistry(uninstallKey2);
                    allInstallations.AddRange(found2);
                    System.Diagnostics.Debug.WriteLine($"[OneCDetector] Uninstall (32-bit): найдено {found2.Count} установок");
                }

                // 3. Проверка через HKLM\SOFTWARE\1C\1Cv8
                var oneCKey1 = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\1C\1Cv8");
                if (oneCKey1 != null)
                {
                    var found3 = ScanOneCRegistry(oneCKey1, "x64");
                    allInstallations.AddRange(found3);
                    System.Diagnostics.Debug.WriteLine($"[OneCDetector] 1C\\1Cv8 (64-bit): найдено {found3.Count} установок");
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine("[OneCDetector] 1C\\1Cv8 (64-bit): ключ не найден");
                }

                // 4. Проверка через HKLM\SOFTWARE\WOW6432Node\1C\1Cv8
                var oneCKey2 = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\1C\1Cv8");
                if (oneCKey2 != null)
                {
                    var found4 = ScanOneCRegistry(oneCKey2, "x86");
                    allInstallations.AddRange(found4);
                    System.Diagnostics.Debug.WriteLine($"[OneCDetector] 1C\\1Cv8 (32-bit): найдено {found4.Count} установок");
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine("[OneCDetector] 1C\\1Cv8 (32-bit): ключ не найден");
                }

                System.Diagnostics.Debug.WriteLine($"[OneCDetector] Всего найдено установок: {allInstallations.Count}");

                // Фильтруем валидные установки
                var validInstallations = allInstallations
                    .Where(inst => !string.IsNullOrEmpty(inst.Version) && !string.IsNullOrEmpty(inst.Path))
                    .ToList();

                System.Diagnostics.Debug.WriteLine($"[OneCDetector] Валидных установок: {validInstallations.Count}");

                if (validInstallations.Count == 0)
                {
                    System.Diagnostics.Debug.WriteLine("[OneCDetector] 1С не найдена");
                    return null;
                }

                // Определяем самую новую версию
                var latest = validInstallations
                    .OrderByDescending(inst => ParseVersion(inst.Version))
                    .ThenByDescending(inst => inst.Edition == "x64") // Предпочитаем x64
                    .First();

                System.Diagnostics.Debug.WriteLine($"[OneCDetector] Последняя версия: {latest.Version} ({latest.Edition}) в {latest.Path}");
                return latest;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[OneCDetector] Ошибка: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Сканирует раздел Uninstall в реестре
        /// </summary>
        private List<OneCInstallationInfo> ScanUninstallRegistry(RegistryKey? uninstallKey)
        {
            var installations = new List<OneCInstallationInfo>();

            if (uninstallKey == null)
            {
                return installations;
            }

            try
            {
                var subKeyNames = uninstallKey.GetSubKeyNames();
                System.Diagnostics.Debug.WriteLine($"[OneCDetector] Сканирование Uninstall: найдено {subKeyNames.Length} подразделов");
                
                foreach (var subKeyName in subKeyNames)
                {
                    using (var subKey = uninstallKey.OpenSubKey(subKeyName))
                    {
                        if (subKey == null) continue;

                        var displayName = subKey.GetValue("DisplayName")?.ToString() ?? "";
                        
                        // Проверяем, что это установка 1С
                        if (!IsOneCInstallation(displayName))
                        {
                            continue;
                        }

                        System.Diagnostics.Debug.WriteLine($"[OneCDetector] Найдена установка 1С: {displayName}");

                        var version = subKey.GetValue("DisplayVersion")?.ToString() ?? "";
                        var installLocation = subKey.GetValue("InstallLocation")?.ToString() ?? "";

                        // Если путь не указан, пытаемся получить из UninstallString
                        if (string.IsNullOrEmpty(installLocation))
                        {
                            var uninstallString = subKey.GetValue("UninstallString")?.ToString() ?? "";
                            if (!string.IsNullOrEmpty(uninstallString))
                            {
                                // Извлекаем путь из строки вида "C:\Program Files\1cv8\...\uninstall.exe" /S
                                var pathMatch = System.Text.RegularExpressions.Regex.Match(
                                    uninstallString, 
                                    @"^""?([^""]+\\bin\\)"
                                );
                                if (pathMatch.Success)
                                {
                                    installLocation = Path.GetDirectoryName(Path.GetDirectoryName(pathMatch.Groups[1].Value)) ?? "";
                                    System.Diagnostics.Debug.WriteLine($"[OneCDetector] Путь извлечен из UninstallString: {installLocation}");
                                }
                            }
                        }

                        // Определяем архитектуру
                        var isWOW64 = uninstallKey.Name.Contains("WOW6432Node");
                        var edition = DetermineArchitecture(installLocation, isWOW64);

                        System.Diagnostics.Debug.WriteLine($"[OneCDetector] Установка: version={version}, path={installLocation}, edition={edition}");

                        if (!string.IsNullOrEmpty(version) && !string.IsNullOrEmpty(installLocation))
                        {
                            installations.Add(new OneCInstallationInfo
                            {
                                Version = version,
                                Path = installLocation,
                                Edition = edition
                            });
                            System.Diagnostics.Debug.WriteLine($"[OneCDetector] Добавлена установка из Uninstall: {version} в {installLocation}");
                        }
                        else
                        {
                            System.Diagnostics.Debug.WriteLine($"[OneCDetector] Пропущена установка (нет версии или пути): version={version}, path={installLocation}");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[OneCDetector] Ошибка сканирования Uninstall: {ex.Message}");
            }
            finally
            {
                uninstallKey?.Dispose();
            }

            return installations;
        }

        /// <summary>
        /// Сканирует раздел 1C\1Cv8 в реестре
        /// </summary>
        private List<OneCInstallationInfo> ScanOneCRegistry(RegistryKey? oneCKey, string defaultEdition)
        {
            var installations = new List<OneCInstallationInfo>();

            if (oneCKey == null)
            {
                return installations;
            }

            try
            {
                // Проверяем корневой ключ
                var rootVersion = oneCKey.GetValue("version")?.ToString();
                var rootPath = oneCKey.GetValue("InstallPath")?.ToString() ?? oneCKey.GetValue("Path")?.ToString();

                if (!string.IsNullOrEmpty(rootVersion) && !string.IsNullOrEmpty(rootPath))
                {
                    var edition = DetermineArchitecture(rootPath, defaultEdition == "x86");
                    installations.Add(new OneCInstallationInfo
                    {
                        Version = rootVersion,
                        Path = rootPath,
                        Edition = edition
                    });
                }

                // Проверяем подразделы (могут быть установлены несколько версий)
                foreach (var subKeyName in oneCKey.GetSubKeyNames())
                {
                    using (var subKey = oneCKey.OpenSubKey(subKeyName))
                    {
                        if (subKey == null) continue;

                        var version = subKey.GetValue("version")?.ToString() ?? subKeyName;
                        var path = subKey.GetValue("InstallPath")?.ToString() ?? 
                                   subKey.GetValue("Path")?.ToString() ?? 
                                   rootPath;

                        if (!string.IsNullOrEmpty(version) && !string.IsNullOrEmpty(path))
                        {
                            var edition = DetermineArchitecture(path, defaultEdition == "x86");
                            installations.Add(new OneCInstallationInfo
                            {
                                Version = version,
                                Path = path,
                                Edition = edition
                            });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Ошибка сканирования 1C реестра: {ex.Message}");
            }
            finally
            {
                oneCKey?.Dispose();
            }

            return installations;
        }

        /// <summary>
        /// Проверяет, является ли установка 1С:Предприятие
        /// </summary>
        private bool IsOneCInstallation(string displayName)
        {
            if (string.IsNullOrEmpty(displayName))
            {
                return false;
            }

            var name = displayName.ToLowerInvariant();
            return name.Contains("1с:предприятие") ||
                   name.Contains("1c:enterprise") ||
                   name.Contains("1c:предприятие") ||
                   (name.Contains("1c") && (name.Contains("предприятие") || name.Contains("enterprise")));
        }

        /// <summary>
        /// Определяет архитектуру установки
        /// </summary>
        private string DetermineArchitecture(string installPath, bool isWOW64)
        {
            if (string.IsNullOrEmpty(installPath))
            {
                return isWOW64 ? "x86" : "x64";
            }

            var programFiles64 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
            var programFiles32 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);

            try
            {
                // Проверяем наличие 64-битного исполняемого файла
                var bin64Path = Path.Combine(installPath, "bin", "1cv8.exe");
                if (File.Exists(bin64Path))
                {
                    // Проверяем, действительно ли это 64-битный файл
                    // (можно использовать PE header, но для простоты проверяем путь)
                    if (installPath.StartsWith(programFiles64, StringComparison.OrdinalIgnoreCase) &&
                        !installPath.StartsWith(programFiles32, StringComparison.OrdinalIgnoreCase))
                    {
                        return "x64";
                    }
                }

                // Проверяем наличие 32-битного исполняемого файла
                var bin86Path = Path.Combine(installPath, "bin", "1cv8.exe");
                if (File.Exists(bin86Path))
                {
                    if (installPath.StartsWith(programFiles32, StringComparison.OrdinalIgnoreCase))
                    {
                        return "x86";
                    }
                }
            }
            catch
            {
                // Игнорируем ошибки доступа к файлам
            }

            // Определяем по пути установки
            if (isWOW64)
            {
                return "x86";
            }

            if (installPath.StartsWith(programFiles64, StringComparison.OrdinalIgnoreCase))
            {
                return "x64";
            }

            return "x86"; // По умолчанию
        }

        /// <summary>
        /// Парсит версию для сравнения (например, "8.3.22.1922" -> [8, 3, 22, 1922])
        /// </summary>
        private int[] ParseVersion(string version)
        {
            try
            {
                return version.Split('.')
                    .Select(v => int.TryParse(v, out var num) ? num : 0)
                    .ToArray();
            }
            catch
            {
                return new[] { 0, 0, 0, 0 };
            }
        }
    }
}

