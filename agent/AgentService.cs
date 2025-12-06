using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using static OneCUpdaterAgent.ApiClient;

namespace OneCUpdaterAgent
{
    public class AgentService : BackgroundService
    {
        private readonly ILogger<AgentService> _logger;
        private readonly Config _config;
        private readonly ApiClient _apiClient;
        private readonly WmiHelper _wmiHelper;
        private readonly OneCInstaller _installer;

        public AgentService(
            ILogger<AgentService> logger,
            Config config,
            ApiClient apiClient,
            WmiHelper wmiHelper,
            OneCInstaller installer)
        {
            _logger = logger;
            _config = config;
            _apiClient = apiClient;
            _wmiHelper = wmiHelper;
            _installer = installer;
            
            // НЕ логируем в конструкторе - это может вызвать проблемы при инициализации DI
            // Логирование будет в ExecuteAsync
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Логируем в EventLog напрямую для гарантии
            try
            {
                using (var eventLog = new System.Diagnostics.EventLog("Application"))
                {
                    eventLog.Source = "1CUpdaterAgent";
                    eventLog.WriteEntry(
                        $"=== ExecuteAsync ВЫЗВАН === PcId={_config.PcId}, AgentId={_config.AgentId}, ServerUrl={_config.ServerUrl}",
                        System.Diagnostics.EventLogEntryType.Information,
                        3000
                    );
                }
            }
            catch { }

            _logger.LogInformation("=== ExecuteAsync: Сервис агента запущен ===");
            _logger.LogInformation($"Конфигурация загружена: PcId={_config.PcId}, AgentId={_config.AgentId}, ServerUrl={_config.ServerUrl}");

            // Регистрация при старте
            _logger.LogInformation("Вызов RegisterAgentAsync...");
            await RegisterAgentAsync();
            _logger.LogInformation("RegisterAgentAsync завершен");

            // Периодическая отправка heartbeat
            _logger.LogInformation("Запуск задачи отправки heartbeat...");
            var heartbeatTask = Task.Run(async () =>
            {
                _logger.LogInformation("Heartbeat задача запущена");
                // Первый heartbeat сразу после регистрации
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                
                while (!stoppingToken.IsCancellationRequested)
                {
                    try
                    {
                        _logger.LogInformation($"Отправка heartbeat: AgentId={_config.AgentId}");
                        var success = await _apiClient.SendHeartbeatAsync(_config.AgentId);
                        if (success)
                        {
                            _logger.LogInformation("✅ Heartbeat отправлен успешно");
                        }
                        else
                        {
                            _logger.LogWarning("⚠️ Не удалось отправить heartbeat");
                        }

                        // Периодически проверяем и обновляем версию 1С при каждом heartbeat
                        try
                        {
                            var oneCVersion = _wmiHelper.GetOneCVersion();
                            var oneCArchitecture = _wmiHelper.GetOneCArchitecture();
                            
                            _logger.LogInformation($"Проверка версии 1С: Version={oneCVersion ?? "null"}, Arch={oneCArchitecture ?? "null"}");
                            
                            // Отправляем статус всегда, даже если 1С не найдена (чтобы очистить версию в БД)
                            var updateStatusRequest = new UpdateStatusRequest
                            {
                                LastOneCVersion = oneCVersion, // Может быть null, если 1С не установлена
                                OneCArchitecture = oneCArchitecture // null, если 1С не найдена
                            };
                            
                            if (!string.IsNullOrEmpty(oneCVersion))
                            {
                                _logger.LogInformation($"Отправка версии 1С на сервер: {oneCVersion} ({oneCArchitecture})");
                            }
                            else
                            {
                                _logger.LogInformation($"Отправка статуса: 1С не найдена, очистка версии на сервере");
                            }
                            
                            var updateSuccess = await _apiClient.UpdateStatusAsync(_config.AgentId, updateStatusRequest);
                            if (updateSuccess)
                            {
                                if (!string.IsNullOrEmpty(oneCVersion))
                                {
                                    _logger.LogInformation($"✅ Версия 1С обновлена на сервере: {oneCVersion} ({oneCArchitecture})");
                                }
                                else
                                {
                                    _logger.LogInformation($"✅ Версия 1С очищена на сервере (1С не установлена)");
                                }
                            }
                            else
                            {
                                _logger.LogWarning($"⚠️ Не удалось обновить версию 1С на сервере");
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, $"❌ Ошибка при проверке версии 1С: {ex.Message}");
                        }

                        await Task.Delay(TimeSpan.FromSeconds(_config.HeartbeatIntervalSeconds), stoppingToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"❌ Ошибка отправки heartbeat: {ex.Message}");
                    }
                }
            }, stoppingToken);

            // Основной цикл опроса задач
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessTasksAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Ошибка обработки задач");
                }

                await Task.Delay(TimeSpan.FromSeconds(_config.PollIntervalSeconds), stoppingToken);
            }

            await heartbeatTask;
        }

        private async Task RegisterAgentAsync()
        {
            try
            {
                try
                {
                    using (var eventLog = new System.Diagnostics.EventLog("Application"))
                    {
                        eventLog.Source = "1CUpdaterAgent";
                        eventLog.WriteEntry(
                            $"=== RegisterAgentAsync НАЧАЛО === PcId={_config.PcId}, AgentId={_config.AgentId}, ServerUrl={_config.ServerUrl}",
                            System.Diagnostics.EventLogEntryType.Information,
                            3100
                        );
                    }
                }
                catch { }

                _logger.LogInformation("Начало регистрации агента...");
                _logger.LogInformation($"Конфигурация: PcId={_config.PcId}, AgentId={_config.AgentId}, ServerUrl={_config.ServerUrl}");

                if (_config.PcId <= 0)
                {
                    _logger.LogError($"ОШИБКА: PcId={_config.PcId} недопустим! Регистрация невозможна.");
                    try
                    {
                        using (var eventLog = new System.Diagnostics.EventLog("Application"))
                        {
                            eventLog.Source = "1CUpdaterAgent";
                            eventLog.WriteEntry(
                                $"❌ ОШИБКА: PcId={_config.PcId} недопустим! Регистрация невозможна.",
                                System.Diagnostics.EventLogEntryType.Error,
                                3101
                            );
                        }
                    }
                    catch { }
                    return;
                }

                _logger.LogInformation("Получение информации о системе...");
                var hostname = _wmiHelper.GetHostname();
                var osVersion = _wmiHelper.GetOsVersion();
                _logger.LogInformation($"Hostname: {hostname}, OS: {osVersion}");

                try
                {
                    using (var eventLog = new System.Diagnostics.EventLog("Application"))
                    {
                        eventLog.Source = "1CUpdaterAgent";
                        eventLog.WriteEntry(
                            $"Системная информация: Hostname={hostname}, OS={osVersion}",
                            System.Diagnostics.EventLogEntryType.Information,
                            3102
                        );
                    }
                }
                catch { }

                _logger.LogInformation("Получение информации о 1С...");
                var oneCVersion = _wmiHelper.GetOneCVersion();
                var oneCArchitecture = _wmiHelper.GetOneCArchitecture();
                _logger.LogInformation($"1C Version: {oneCVersion ?? "не найдена"}, Architecture: {oneCArchitecture ?? "не найдена"}");

                try
                {
                    using (var eventLog = new System.Diagnostics.EventLog("Application"))
                    {
                        eventLog.Source = "1CUpdaterAgent";
                        eventLog.WriteEntry(
                            $"1C информация: Version={oneCVersion ?? "не найдена"}, Architecture={oneCArchitecture ?? "не найдена"}",
                            System.Diagnostics.EventLogEntryType.Information,
                            3103
                        );
                    }
                }
                catch { }

                var request = new RegisterAgentRequest
                {
                    PcId = _config.PcId,
                    AgentId = _config.AgentId,
                    Hostname = hostname,
                    OsVersion = osVersion,
                    LastOneCVersion = oneCVersion,
                    OneCArchitecture = oneCArchitecture
                };

                try
                {
                    using (var eventLog = new System.Diagnostics.EventLog("Application"))
                    {
                        eventLog.Source = "1CUpdaterAgent";
                        eventLog.WriteEntry(
                            $"Отправка запроса регистрации: PcId={request.PcId}, AgentId={request.AgentId}",
                            System.Diagnostics.EventLogEntryType.Information,
                            3104
                        );
                    }
                }
                catch { }

                _logger.LogInformation("Отправка запроса регистрации на сервер...");
                var success = await _apiClient.RegisterAgentAsync(request);
                if (success)
                {
                    _logger.LogInformation("✅ Агент успешно зарегистрирован на сервере");
                    try
                    {
                        using (var eventLog = new System.Diagnostics.EventLog("Application"))
                        {
                            eventLog.Source = "1CUpdaterAgent";
                            eventLog.WriteEntry(
                                "✅ Агент успешно зарегистрирован на сервере!",
                                System.Diagnostics.EventLogEntryType.Information,
                                3105
                            );
                        }
                    }
                    catch { }
                }
                else
                {
                    _logger.LogWarning("⚠️ Не удалось зарегистрировать агента. Проверьте доступность сервера и правильность PcId.");
                    try
                    {
                        using (var eventLog = new System.Diagnostics.EventLog("Application"))
                        {
                            eventLog.Source = "1CUpdaterAgent";
                            eventLog.WriteEntry(
                                "⚠️ Не удалось зарегистрировать агента. Проверьте доступность сервера и правильность PcId.",
                                System.Diagnostics.EventLogEntryType.Warning,
                                3106
                            );
                        }
                    }
                    catch { }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ КРИТИЧЕСКАЯ ОШИБКА регистрации агента: {ex.Message}");
                _logger.LogError($"Stack Trace: {ex.StackTrace}");
                
                try
                {
                    using (var eventLog = new System.Diagnostics.EventLog("Application"))
                    {
                        eventLog.Source = "1CUpdaterAgent";
                        eventLog.WriteEntry(
                            $"❌ КРИТИЧЕСКАЯ ОШИБКА регистрации: {ex.Message}\nТип: {ex.GetType().Name}\nStack: {ex.StackTrace}",
                            System.Diagnostics.EventLogEntryType.Error,
                            3107
                        );
                    }
                }
                catch { }
            }
        }

        private async Task ProcessTasksAsync()
        {
            try
            {
                var tasks = await _apiClient.GetPendingTasksAsync(_config.AgentId);

                foreach (var task in tasks)
                {
                    _logger.LogInformation($"Обработка задачи: {task.Name}");

                    var success = await _installer.InstallDistributionAsync(
                        task.Id,
                        task.Distribution.Id,
                        task.Distribution.Filename
                    );

                    if (success)
                    {
                        _logger.LogInformation($"Задача {task.Name} выполнена успешно");
                    }
                    else
                    {
                        _logger.LogWarning($"Задача {task.Name} завершилась с ошибкой");
                    }
                    
                    // Принудительная сборка мусора после обработки каждой задачи
                    System.GC.Collect(System.GC.MaxGeneration, System.GCCollectionMode.Forced, true);
                    System.GC.WaitForPendingFinalizers();
                    System.GC.Collect(System.GC.MaxGeneration, System.GCCollectionMode.Forced, true);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка обработки задач");
            }
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Сервис агента остановлен");
            await base.StopAsync(cancellationToken);
        }
    }
}

