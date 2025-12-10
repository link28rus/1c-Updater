using System.Diagnostics;
using System.IO.Compression;
using Microsoft.Extensions.Logging;
using static OneCUpdaterAgent.ApiClient;

namespace OneCUpdaterAgent
{
    public class OneCInstaller
    {
        private readonly ApiClient _apiClient;
        private readonly Config _config;
        private readonly ILogger<OneCInstaller> _logger;
        private readonly WmiHelper _wmiHelper;

        public OneCInstaller(ApiClient apiClient, Config config, ILogger<OneCInstaller> logger, WmiHelper wmiHelper)
        {
            _apiClient = apiClient;
            _config = config;
            _logger = logger;
            _wmiHelper = wmiHelper;
        }

        public async Task<bool> InstallDistributionAsync(int taskId, int distributionId, string filename)
        {
            string? extractPath = null;
            try
            {
                _logger?.LogInformation($"Начало установки дистрибутива {filename} для задачи {taskId}");

                // Загружаем дистрибутив потоковым способом (это ZIP архив с распакованным дистрибутивом)
                string? extractTo = null;
                
                // Создаем временную директорию для распаковки
                var tempDir = Path.Combine(Path.GetTempPath(), "1CUpdaterAgent", Guid.NewGuid().ToString());
                if (!Directory.Exists(tempDir))
                {
                    Directory.CreateDirectory(tempDir);
                }
                extractPath = tempDir;

                // Загружаем ZIP архив напрямую в файл (потоковая загрузка)
                var zipPath = Path.Combine(tempDir, $"{distributionId}.zip");
                var downloadSuccess = await _apiClient.DownloadDistributionToFileAsync(distributionId, zipPath);
                
                if (!downloadSuccess || !File.Exists(zipPath))
                {
                    await _apiClient.ReportTaskProgressAsync(
                        _config.AgentId,
                        taskId,
                        "failed",
                        "Не удалось загрузить дистрибутив"
                    );
                    _logger?.LogError("Не удалось загрузить дистрибутив");
                    return false;
                }

                var fileInfo = new FileInfo(zipPath);
                _logger?.LogInformation($"Архив загружен, размер: {fileInfo.Length / 1024 / 1024}MB");

                // Определяем тип архива и распаковываем
                extractTo = Path.Combine(tempDir, "extracted");
                Directory.CreateDirectory(extractTo);
                
                var extension = Path.GetExtension(zipPath).ToLower();
                if (extension == ".zip")
                {
                    ZipFile.ExtractToDirectory(zipPath, extractTo);
                    _logger?.LogInformation($"ZIP архив распакован в: {extractTo}");
                }
                else if (extension == ".rar")
                {
                    await ExtractRarArchiveAsync(zipPath, extractTo);
                    _logger?.LogInformation($"RAR архив распакован в: {extractTo}");
                }
                else
                {
                    throw new NotSupportedException($"Неподдерживаемый формат архива: {extension}");
                }

                // Удаляем архивный файл
                File.Delete(zipPath);

                // Ищем установочный файл (setup.exe, *.msi, или первый .exe)
                if (string.IsNullOrEmpty(extractTo))
                {
                    await _apiClient.ReportTaskProgressAsync(
                        _config.AgentId,
                        taskId,
                        "failed",
                        "Ошибка распаковки дистрибутива"
                    );
                    _logger?.LogError("Ошибка распаковки дистрибутива");
                    return false;
                }
                
                var installerPath = FindInstallerFile(extractTo);
                if (string.IsNullOrEmpty(installerPath))
                {
                    await _apiClient.ReportTaskProgressAsync(
                        _config.AgentId,
                        taskId,
                        "failed",
                        "Не найден установочный файл (setup.exe или .msi)"
                    );
                    _logger?.LogError("Не найден установочный файл");
                    return false;
                }

                _logger?.LogInformation($"Найден установочный файл: {installerPath}");

                // Определяем аргументы для установки
                var arguments = GetInstallArguments(installerPath);

                // Запускаем установщик
                var processInfo = new ProcessStartInfo
                {
                    FileName = installerPath,
                    Arguments = arguments,
                    UseShellExecute = true,
                    Verb = "runas", // Запуск от имени администратора
                    CreateNoWindow = true,
                    WorkingDirectory = Path.GetDirectoryName(installerPath)
                };

                await _apiClient.ReportTaskProgressAsync(
                    _config.AgentId,
                    taskId,
                    "in_progress",
                    null
                );

                _logger?.LogInformation($"Запуск установки: {installerPath} {arguments}");

                using (var process = Process.Start(processInfo))
                {
                    if (process != null)
                    {
                        // Таймаут установки: 30 минут (для больших дистрибутивов)
                        var timeout = TimeSpan.FromMinutes(30);
                        var cancellationTokenSource = new CancellationTokenSource(timeout);
                        
                        try
                        {
                            await process.WaitForExitAsync(cancellationTokenSource.Token);
                            
                            _logger?.LogInformation($"Установка завершена с кодом: {process.ExitCode}");
                        }
                        catch (OperationCanceledException)
                        {
                            _logger?.LogError($"Таймаут установки: процесс не завершился за {timeout.TotalMinutes} минут");
                            
                            // Пытаемся завершить процесс
                            try
                            {
                                if (!process.HasExited)
                                {
                                    process.Kill();
                                    _logger?.LogInformation("Процесс установки принудительно завершен");
                                }
                            }
                            catch (Exception ex)
                            {
                                _logger?.LogWarning(ex, "Не удалось завершить зависший процесс установки");
                            }
                            
                            await _apiClient.ReportTaskProgressAsync(
                                _config.AgentId,
                                taskId,
                                "failed",
                                $"Таймаут установки: процесс не завершился за {timeout.TotalMinutes} минут"
                            );
                            return false;
                        }

                        if (process.ExitCode == 0 || process.ExitCode == 3010) // 3010 = успешная установка с перезагрузкой
                        {
                            await _apiClient.ReportTaskProgressAsync(
                                _config.AgentId,
                                taskId,
                                "completed",
                                null
                            );
                            
                            _logger?.LogInformation("Установка завершена успешно");
                            
                            // Ждем немного, чтобы система обновила информацию о версии 1С
                            await Task.Delay(TimeSpan.FromSeconds(2));
                            
                            // Получаем актуальную версию 1С после установки
                            var oneCVersion = _wmiHelper.GetOneCVersion();
                            var oneCArchitecture = _wmiHelper.GetOneCArchitecture();
                            
                            if (!string.IsNullOrEmpty(oneCVersion))
                            {
                                _logger?.LogInformation($"Обновление версии 1С на сервере: {oneCVersion} ({oneCArchitecture ?? "не определена"})");
                                
                                var updateStatusRequest = new UpdateStatusRequest
                                {
                                    LastOneCVersion = oneCVersion,
                                    OneCArchitecture = oneCArchitecture // Может быть null, если не определена
                                };
                                
                                var updateSuccess = await _apiClient.UpdateStatusAsync(_config.AgentId, updateStatusRequest);
                                if (updateSuccess)
                                {
                                    _logger?.LogInformation($"✅ Версия 1С успешно обновлена на сервере: {oneCVersion}");
                                }
                                else
                                {
                                    _logger?.LogWarning($"⚠️ Не удалось обновить версию 1С на сервере");
                                }
                            }
                            else
                            {
                                _logger?.LogWarning("⚠️ Не удалось определить версию 1С после установки");
                            }
                            
                            // Очищаем временные файлы
                            CleanupTempDirectory(extractPath);
                            
                            // Принудительная сборка мусора после завершения задачи
                            GC.Collect(GC.MaxGeneration, GCCollectionMode.Forced, true);
                            GC.WaitForPendingFinalizers();
                            GC.Collect(GC.MaxGeneration, GCCollectionMode.Forced, true);
                            
                            _logger?.LogInformation("Память освобождена после выполнения задачи");
                            
                            return true;
                        }
                        else
                        {
                            await _apiClient.ReportTaskProgressAsync(
                                _config.AgentId,
                                taskId,
                                "failed",
                                $"Установка завершилась с кодом ошибки: {process.ExitCode}"
                            );
                            _logger?.LogWarning($"Установка завершилась с ошибкой: {process.ExitCode}");
                            return false;
                        }
                    }
                    else
                    {
                        await _apiClient.ReportTaskProgressAsync(
                            _config.AgentId,
                            taskId,
                            "failed",
                            "Не удалось запустить процесс установки"
                        );
                        _logger?.LogError("Не удалось запустить процесс установки");
                        return false;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, $"Ошибка установки: {ex.Message}");
                await _apiClient.ReportTaskProgressAsync(
                    _config.AgentId,
                    taskId,
                    "failed",
                    $"Ошибка установки: {ex.Message}"
                );
                
                // Очищаем временные файлы при ошибке
                if (!string.IsNullOrEmpty(extractPath) && Directory.Exists(extractPath))
                {
                    CleanupTempDirectory(extractPath);
                }
                
                // Принудительная сборка мусора при ошибке
                GC.Collect(GC.MaxGeneration, GCCollectionMode.Forced, true);
                GC.WaitForPendingFinalizers();
                GC.Collect(GC.MaxGeneration, GCCollectionMode.Forced, true);
                
                return false;
            }
        }

        private string? FindInstallerFile(string directory)
        {
            // Приоритет: setup.exe > *.msi > первый .exe
            var setupExe = Directory.GetFiles(directory, "setup.exe", SearchOption.AllDirectories).FirstOrDefault();
            if (!string.IsNullOrEmpty(setupExe))
                return setupExe;

            var msiFiles = Directory.GetFiles(directory, "*.msi", SearchOption.AllDirectories);
            if (msiFiles.Length > 0)
                return msiFiles[0];

            var exeFiles = Directory.GetFiles(directory, "*.exe", SearchOption.AllDirectories);
            if (exeFiles.Length > 0)
                return exeFiles[0];

            return null;
        }

        private string GetInstallArguments(string installerPath)
        {
            var extension = Path.GetExtension(installerPath).ToLower();
            
            if (extension == ".msi")
            {
                // Тихая установка MSI
                return "/quiet /norestart";
            }
            else
            {
                // Тихая установка EXE (для установщиков 1С)
                return "/S";
            }
        }

        private async Task ExtractRarArchiveAsync(string rarPath, string extractTo)
        {
            // Пробуем использовать WinRAR или 7-Zip для распаковки RAR
            var unrarCommands = new[]
            {
                // WinRAR в стандартных местах
                $"\"C:\\Program Files\\WinRAR\\WinRAR.exe\" x -o+ -ibck \"{rarPath}\" \"{extractTo}\\\"",
                $"\"C:\\Program Files (x86)\\WinRAR\\WinRAR.exe\" x -o+ -ibck \"{rarPath}\" \"{extractTo}\\\"",
                // 7-Zip (может распаковывать RAR)
                $"\"C:\\Program Files\\7-Zip\\7z.exe\" x -o\"{extractTo}\" \"{rarPath}\"",
                $"\"C:\\Program Files (x86)\\7-Zip\\7z.exe\" x -o\"{extractTo}\" \"{rarPath}\"",
            };

            var timeout = TimeSpan.FromMinutes(10);
            Exception? lastError = null;

            foreach (var command in unrarCommands)
            {
                try
                {
                    _logger?.LogInformation($"Попытка распаковки RAR: {command}");
                    
                    var processInfo = new ProcessStartInfo
                    {
                        FileName = "cmd.exe",
                        Arguments = $"/c {command}",
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                    };

                    using (var process = Process.Start(processInfo))
                    {
                        if (process != null)
                        {
                            var cancellationTokenSource = new CancellationTokenSource(timeout);
                            await process.WaitForExitAsync(cancellationTokenSource.Token);

                            if (process.ExitCode == 0)
                            {
                                // Проверяем, что файлы были распакованы
                                if (Directory.Exists(extractTo) && Directory.GetFiles(extractTo, "*", SearchOption.AllDirectories).Length > 0)
                                {
                                    _logger?.LogInformation($"RAR успешно распакован в {extractTo}");
                                    return;
                                }
                            }
                        }
                    }
                }
                catch (OperationCanceledException)
                {
                    _logger?.LogWarning($"Таймаут распаковки RAR: {command}");
                    lastError = new TimeoutException($"Таймаут распаковки RAR архива");
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, $"Ошибка при распаковке RAR: {command}");
                    lastError = ex;
                    continue;
                }
            }

            // Если все команды не сработали
            throw new Exception(
                $"Не удалось распаковать RAR архив. Установите WinRAR или 7-Zip. " +
                $"Последняя ошибка: {lastError?.Message ?? "Unknown error"}"
            );
        }

        private void CleanupTempDirectory(string directory)
        {
            try
            {
                if (Directory.Exists(directory))
                {
                    Directory.Delete(directory, true);
                    _logger?.LogInformation($"Временная директория удалена: {directory}");
                }
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, $"Не удалось удалить временную директорию: {ex.Message}");
            }
        }
    }
}

