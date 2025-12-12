using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Microsoft.Win32;
using Microsoft.Extensions.Logging;

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

                // 3. Проверка через HKLM\SOFTWARE\1C\1Cv8\8.3 (правильный путь для версий 8.3)
                var oneCKey1 = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\1C\1Cv8\8.3");
                if (oneCKey1 != null)
                {
                    var found3 = ScanOneC83Registry(oneCKey1, "x64");
                    allInstallations.AddRange(found3);
                    System.Diagnostics.Debug.WriteLine($"[OneCDetector] 1C\\1Cv8\\8.3 (64-bit): найдено {found3.Count} установок");
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine("[OneCDetector] 1C\\1Cv8\\8.3 (64-bit): ключ не найден");
                }

                // 4. Проверка через HKLM\SOFTWARE\WOW6432Node\1C\1Cv8\8.3 (правильный путь для версий 8.3)
                var oneCKey2 = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\1C\1Cv8\8.3");
                if (oneCKey2 != null)
                {
                    var found4 = ScanOneC83Registry(oneCKey2, "x86");
                    allInstallations.AddRange(found4);
                    System.Diagnostics.Debug.WriteLine($"[OneCDetector] 1C\\1Cv8\\8.3 (32-bit): найдено {found4.Count} установок");
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine("[OneCDetector] 1C\\1Cv8\\8.3 (32-bit): ключ не найден");
                }

                // 5. Fallback: проверка через старые пути (для совместимости)
                var oneCKeyOld1 = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\1C\1Cv8");
                if (oneCKeyOld1 != null)
                {
                    var foundOld1 = ScanOneCRegistry(oneCKeyOld1, "x64");
                    allInstallations.AddRange(foundOld1);
                    System.Diagnostics.Debug.WriteLine($"[OneCDetector] 1C\\1Cv8 (64-bit, fallback): найдено {foundOld1.Count} установок");
                }

                var oneCKeyOld2 = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\1C\1Cv8");
                if (oneCKeyOld2 != null)
                {
                    var foundOld2 = ScanOneCRegistry(oneCKeyOld2, "x86");
                    allInstallations.AddRange(foundOld2);
                    System.Diagnostics.Debug.WriteLine($"[OneCDetector] 1C\\1Cv8 (32-bit, fallback): найдено {foundOld2.Count} установок");
                }

                // 6. Поиск через файловую систему (если не найдено в реестре)
                if (allInstallations.Count == 0)
                {
                    System.Diagnostics.Debug.WriteLine("[OneCDetector] Реестр не дал результатов, поиск через файловую систему...");
                    var found5 = ScanFileSystem();
                    allInstallations.AddRange(found5);
                    System.Diagnostics.Debug.WriteLine($"[OneCDetector] Файловая система: найдено {found5.Count} установок");
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
        /// Получает последнюю установленную версию 1С:Предприятие через реестр Windows
        /// Ищет в стандартных путях Uninstall, где MSI установщики хранят информацию о версиях
        /// </summary>
        /// <param name="logger">Опциональный logger для логирования процесса поиска</param>
        /// <returns>Версия в формате "8.3.23.1865" или null, если не найдена</returns>
        public static string? GetLatest1CVersion(ILogger? logger = null)
        {
            try
            {
                // Всегда логируем начало поиска - принудительно в EventLog
                var startMessage = "[OneCDetector] Scanning uninstall registry keys...";
                try
                {
                    using (var eventLog = new System.Diagnostics.EventLog("Application"))
                    {
                        eventLog.Source = "1CUpdaterAgent";
                        eventLog.WriteEntry(startMessage, System.Diagnostics.EventLogEntryType.Information, 5001);
                    }
                }
                catch { }
                
                LogMessage(logger, "Scanning uninstall registry keys...", System.Diagnostics.EventLogEntryType.Information, 5000);
                System.Diagnostics.Debug.WriteLine("[OneCDetector] GetLatest1CVersion called, logger is " + (logger != null ? "NOT NULL" : "NULL"));

                var validVersions = new List<Version>();
                var registryPaths = new[]
                {
                    @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",           // 64-bit
                    @"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall" // 32-bit
                };

                foreach (var registryPath in registryPaths)
                {
                    try
                    {
                        using (var uninstallKey = Registry.LocalMachine.OpenSubKey(registryPath))
                        {
                            if (uninstallKey == null)
                            {
                                LogMessage(logger, $"Registry path not accessible: {registryPath}", System.Diagnostics.EventLogEntryType.Warning, 5000);
                                continue;
                            }

                            var subKeyNames = uninstallKey.GetSubKeyNames();
                            LogMessage(logger, $"Scanning {subKeyNames.Length} entries in {registryPath}", System.Diagnostics.EventLogEntryType.Information, 5000);

                            foreach (var subKeyName in subKeyNames)
                            {
                                try
                                {
                                    using (var subKey = uninstallKey.OpenSubKey(subKeyName))
                                    {
                                        if (subKey == null) continue;

                                        var displayNameObj = subKey.GetValue("DisplayName");
                                        var displayVersionObj = subKey.GetValue("DisplayVersion");

                                        // Пропускаем, если DisplayName отсутствует
                                        if (displayNameObj == null)
                                        {
                                            continue;
                                        }

                                        var displayName = displayNameObj.ToString() ?? "";
                                        
                                        // Пропускаем пустые имена
                                        if (string.IsNullOrWhiteSpace(displayName))
                                        {
                                            continue;
                                        }

                                        // Упрощенная проверка: ищем "1С" или "1C" + "Предприятие" или "Enterprise" + "8"
                                        // Точно так же, как это делает PowerShell: $name -like "*1С*Предприятие*" -or ($name -like "*1C*" -and $name -like "*8*")
                                        var has1C = displayName.Contains("1C", StringComparison.OrdinalIgnoreCase) || 
                                                   displayName.Contains("1С", StringComparison.OrdinalIgnoreCase);
                                        var hasPredpriyatie = displayName.Contains("Предприятие", StringComparison.OrdinalIgnoreCase);
                                        var hasEnterprise = displayName.Contains("Enterprise", StringComparison.OrdinalIgnoreCase);
                                        var has8 = displayName.Contains("8", StringComparison.OrdinalIgnoreCase) || 
                                                  displayName.Contains("v8", StringComparison.OrdinalIgnoreCase);

                                        var isOneC = has1C && (hasPredpriyatie || hasEnterprise || has8);

                                        if (!isOneC)
                                        {
                                            continue;
                                        }
                                        
                                        // Логируем найденный продукт 1С
                                        var displayVersion = displayVersionObj?.ToString() ?? "";
                                        LogMessage(logger, $"Found potential 1C product: DisplayName='{displayName}', DisplayVersion='{displayVersion}'", System.Diagnostics.EventLogEntryType.Information, 5011);

                                        // Пытаемся распарсить версию из DisplayVersion
                                        Version? parsedVersion = null;
                                        if (!string.IsNullOrWhiteSpace(displayVersion))
                                        {
                                            if (Version.TryParse(displayVersion, out var version))
                                            {
                                                parsedVersion = version;
                                            }
                                        }

                                        // Если DisplayVersion пуст или невалиден, пытаемся извлечь версию из DisplayName
                                        if (parsedVersion == null)
                                        {
                                            var versionMatch = System.Text.RegularExpressions.Regex.Match(displayName, @"(\d+\.\d+\.\d+\.\d+)");
                                            if (versionMatch.Success && Version.TryParse(versionMatch.Groups[1].Value, out var extractedVersion))
                                            {
                                                parsedVersion = extractedVersion;
                                                LogMessage(logger, $"Extracted version from DisplayName: {extractedVersion}", System.Diagnostics.EventLogEntryType.Information, 5014);
                                            }
                                        }

                                        if (parsedVersion != null)
                                        {
                                            validVersions.Add(parsedVersion);
                                            LogMessage(logger, $"✅ Found valid 1C product: {displayName}, version: {parsedVersion}", System.Diagnostics.EventLogEntryType.Information, 5012);
                                        }
                                        else
                                        {
                                            LogMessage(logger, $"Skipping entry: no valid version found - DisplayName='{displayName}', DisplayVersion='{displayVersion}'", System.Diagnostics.EventLogEntryType.Warning, 5015);
                                        }
                                    }
                                }
                                catch (Exception ex)
                                {
                                    LogMessage(logger, $"Error reading subkey {subKeyName}: {ex.Message}", System.Diagnostics.EventLogEntryType.Error, 5016);
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        LogMessage(logger, $"Error reading registry path {registryPath}: {ex.Message}", System.Diagnostics.EventLogEntryType.Error, 5017);
                    }
                }

                if (validVersions.Count == 0)
                {
                    LogMessage(logger, "1C not found", System.Diagnostics.EventLogEntryType.Warning, 5018);
                    return null;
                }

                // Находим максимальную версию
                var latestVersion = validVersions.Max();
                var versionString = latestVersion.ToString();

                LogMessage(logger, $"Latest installed 1C version: {versionString}", System.Diagnostics.EventLogEntryType.Information, 5019);
                return versionString;
            }
            catch (Exception ex)
            {
                LogMessage(logger, $"Error getting latest 1C version: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Вспомогательный метод для логирования с поддержкой ILogger и fallback на Debug.WriteLine
        /// Также логирует в EventLog для гарантированной видимости
        /// </summary>
        private static void LogMessage(ILogger? logger, string message, System.Diagnostics.EventLogEntryType entryType = System.Diagnostics.EventLogEntryType.Information, int eventId = 5000)
        {
            var fullMessage = $"[OneCDetector] {message}";
            
            // Логируем через ILogger
            if (logger != null)
            {
                logger.LogInformation(fullMessage);
            }
            else
            {
                System.Diagnostics.Debug.WriteLine(fullMessage);
            }
            
            // Дополнительно логируем в EventLog для критичных сообщений о поиске
            try
            {
                using (var eventLog = new System.Diagnostics.EventLog("Application"))
                {
                    eventLog.Source = "1CUpdaterAgent";
                    // Логируем все важные сообщения о поиске 1С - ВСЕГДА
                    var shouldLog = message.Contains("Scanning", StringComparison.OrdinalIgnoreCase) || 
                                   message.Contains("Found product", StringComparison.OrdinalIgnoreCase) || 
                                   message.Contains("Latest installed", StringComparison.OrdinalIgnoreCase) || 
                                   message.Contains("1C not found", StringComparison.OrdinalIgnoreCase) ||
                                   message.Contains("Error", StringComparison.OrdinalIgnoreCase) ||
                                   message.Contains("GetLatest1CVersion called", StringComparison.OrdinalIgnoreCase) ||
                                   message.Contains("Scanning", StringComparison.OrdinalIgnoreCase);
                    
                    // Всегда логируем в EventLog с переданными параметрами
                    try
                    {
                        eventLog.WriteEntry(fullMessage, entryType, eventId);
                    }
                    catch (Exception ex)
                    {
                        // Если не удалось записать, пробуем через Debug
                        System.Diagnostics.Debug.WriteLine($"[OneCDetector] Failed to write to EventLog: {ex.Message}");
                    }
                }
            }
            catch
            {
                // Игнорируем ошибки записи в EventLog
            }
        }

        /// <summary>
        /// Проверяет, является ли строка валидным форматом версии (8.3.XX.XXXX)
        /// </summary>
        private static bool IsValidVersionFormat(string version)
        {
            if (string.IsNullOrEmpty(version))
            {
                return false;
            }

            // Проверяем формат: 8.3.XX.XXXX (где XX - цифры)
            return System.Text.RegularExpressions.Regex.IsMatch(version, @"^8\.3\.\d+\.\d+$");
        }

        /// <summary>
        /// Парсит версию для семантической сортировки
        /// Возвращает массив чисел для корректного сравнения
        /// </summary>
        private static int[] ParseVersionForSorting(string version)
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


        /// <summary>
        /// Сканирует раздел 1C\1Cv8\8.3 в реестре (правильный путь для версий 8.3)
        /// Ищет подразделы с версиями вида 8.3.23.1865
        /// </summary>
        private List<OneCInstallationInfo> ScanOneC83Registry(RegistryKey? oneC83Key, string defaultEdition)
        {
            var installations = new List<OneCInstallationInfo>();

            if (oneC83Key == null)
            {
                return installations;
            }

            try
            {
                System.Diagnostics.Debug.WriteLine($"[OneCDetector] Сканирование 1C\\1Cv8\\8.3: найдено {oneC83Key.GetSubKeyNames().Length} подразделов");

                // Ищем подразделы с версиями (например, 8.3.23.1865)
                foreach (var subKeyName in oneC83Key.GetSubKeyNames())
                {
                    // Проверяем, что имя подраздела похоже на версию (8.3.XX.XXXX)
                    if (!IsValidVersionFormat(subKeyName))
                    {
                        continue;
                    }

                    using (var subKey = oneC83Key.OpenSubKey(subKeyName))
                    {
                        if (subKey == null) continue;

                        var version = subKeyName; // Версия - это имя подраздела
                        var path = subKey.GetValue("InstallPath")?.ToString() ?? 
                                   subKey.GetValue("Path")?.ToString() ??
                                   subKey.GetValue("Location")?.ToString();

                        System.Diagnostics.Debug.WriteLine($"[OneCDetector] Найдена версия 8.3: {version}, Path: {path ?? "не указан"}");

                        if (!string.IsNullOrEmpty(path) && Directory.Exists(path))
                        {
                            var edition = DetermineArchitecture(path, defaultEdition == "x86");
                            installations.Add(new OneCInstallationInfo
                            {
                                Version = version,
                                Path = path,
                                Edition = edition
                            });
                            System.Diagnostics.Debug.WriteLine($"[OneCDetector] Добавлена установка из 8.3: {version} ({edition}) в {path}");
                        }
                        else
                        {
                            System.Diagnostics.Debug.WriteLine($"[OneCDetector] Пропущена версия {version} (путь не указан или не существует)");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[OneCDetector] Ошибка сканирования 1C\\1Cv8\\8.3: {ex.Message}");
            }
            finally
            {
                oneC83Key?.Dispose();
            }

            return installations;
        }

        /// <summary>
        /// Сканирует раздел 1C\1Cv8 в реестре (старый метод для совместимости)
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
        /// Сканирует файловую систему в поисках установок 1С
        /// </summary>
        private List<OneCInstallationInfo> ScanFileSystem()
        {
            var installations = new List<OneCInstallationInfo>();
            var searchPaths = new[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "1cv8"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "1cv8"),
                @"C:\Program Files\1cv8",
                @"C:\Program Files (x86)\1cv8",
                @"D:\Program Files\1cv8",
                @"D:\Program Files (x86)\1cv8"
            };

            foreach (var basePath in searchPaths)
            {
                try
                {
                    if (!Directory.Exists(basePath))
                    {
                        continue;
                    }

                    System.Diagnostics.Debug.WriteLine($"[OneCDetector] Сканирование файловой системы: {basePath}");

                    // Ищем подпапки с версиями (например, 8.3.22.1922)
                    var versionDirs = Directory.GetDirectories(basePath)
                        .Where(dir =>
                        {
                            var dirName = Path.GetFileName(dir);
                            // Проверяем, что имя папки похоже на версию (например, 8.3.22.1922)
                            return System.Text.RegularExpressions.Regex.IsMatch(dirName, @"^\d+\.\d+\.\d+");
                        })
                        .ToList();

                    foreach (var versionDir in versionDirs)
                    {
                        var binPath = Path.Combine(versionDir, "bin", "1cv8.exe");
                        if (File.Exists(binPath))
                        {
                            var version = Path.GetFileName(versionDir);
                            var edition = DetermineArchitecture(versionDir, false);

                            System.Diagnostics.Debug.WriteLine($"[OneCDetector] Найдена установка в файловой системе: {version} ({edition}) в {versionDir}");

                            installations.Add(new OneCInstallationInfo
                            {
                                Version = version,
                                Path = versionDir,
                                Edition = edition
                            });
                        }
                    }
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"[OneCDetector] Ошибка сканирования {basePath}: {ex.Message}");
                }
            }

            return installations;
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

