using System;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.EventLog;

namespace OneCUpdaterAgent
{
    public class Program
    {
        public static void Main(string[] args)
        {
            // Создаем источник событий, если его нет
            try
            {
                if (!System.Diagnostics.EventLog.SourceExists("1CUpdaterAgent"))
                {
                    System.Diagnostics.EventLog.CreateEventSource("1CUpdaterAgent", "Application");
                }
            }
            catch
            {
                // Игнорируем ошибки создания источника
            }

            // Логируем начало запуска
            try
            {
                using (var eventLog = new System.Diagnostics.EventLog("Application"))
                {
                    eventLog.Source = "1CUpdaterAgent";
                    eventLog.WriteEntry(
                        "Начало запуска службы 1C Updater Agent",
                        System.Diagnostics.EventLogEntryType.Information,
                        1000
                    );
                }
            }
            catch
            {
                // Игнорируем ошибки записи в EventLog
            }

            try
            {
                // Логируем перед созданием HostBuilder
                try
                {
                    using (var eventLog = new System.Diagnostics.EventLog("Application"))
                    {
                        eventLog.Source = "1CUpdaterAgent";
                        eventLog.WriteEntry(
                            "Вызов CreateHostBuilder...",
                            System.Diagnostics.EventLogEntryType.Information,
                            1001
                        );
                    }
                }
                catch { }

                var hostBuilder = CreateHostBuilder(args);
                
                // Логируем после создания HostBuilder
                try
                {
                    using (var eventLog = new System.Diagnostics.EventLog("Application"))
                    {
                        eventLog.Source = "1CUpdaterAgent";
                        eventLog.WriteEntry(
                            "HostBuilder создан, вызов Build()...",
                            System.Diagnostics.EventLogEntryType.Information,
                            1002
                        );
                    }
                }
                catch { }

                var host = hostBuilder.Build();
                
                // Логируем успешное создание host
                try
                {
                    using (var eventLog = new System.Diagnostics.EventLog("Application"))
                    {
                        eventLog.Source = "1CUpdaterAgent";
                        eventLog.WriteEntry(
                            "Host создан успешно, запуск службы...",
                            System.Diagnostics.EventLogEntryType.Information,
                            1003
                        );
                    }
                }
                catch { }

                // Логируем перед host.Run()
                try
                {
                    using (var eventLog = new System.Diagnostics.EventLog("Application"))
                    {
                        eventLog.Source = "1CUpdaterAgent";
                        eventLog.WriteEntry(
                            "Вызов host.Run()...",
                            System.Diagnostics.EventLogEntryType.Information,
                            1004
                        );
                    }
                }
                catch { }

                host.Run();
            }
            catch (Exception ex)
            {
                // Логируем критическую ошибку в EventLog
                try
                {
                    using (var eventLog = new System.Diagnostics.EventLog("Application"))
                    {
                        eventLog.Source = "1CUpdaterAgent";
                        eventLog.WriteEntry(
                            $"Критическая ошибка при запуске службы: {ex.Message}\n\nТип: {ex.GetType().Name}\n\nStack Trace:\n{ex.StackTrace}",
                            System.Diagnostics.EventLogEntryType.Error,
                            1002
                        );
                    }
                }
                catch
                {
                    // Если не удалось записать в EventLog, выводим в консоль
                    Console.WriteLine($"Критическая ошибка: {ex.Message}");
                    Console.WriteLine($"Тип: {ex.GetType().Name}");
                    Console.WriteLine($"Stack Trace: {ex.StackTrace}");
                }
                throw;
            }
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .UseWindowsService()
                .ConfigureServices((hostContext, services) =>
                {
                    // Логируем начало настройки сервисов
                    try
                    {
                        using (var eventLog = new System.Diagnostics.EventLog("Application"))
                        {
                            eventLog.Source = "1CUpdaterAgent";
                            eventLog.WriteEntry(
                                "Настройка сервисов (ConfigureServices)...",
                                System.Diagnostics.EventLogEntryType.Information,
                                1003
                            );
                        }
                    }
                    catch { }

                    // Создаем Config вручную, чтобы избежать проблем с DI и логированием
                    var config = new Config();
                    services.AddSingleton<Config>(provider => config);
                    
                    services.AddSingleton<ApiClient>();
                    services.AddSingleton<WmiHelper>();
                    services.AddSingleton<OneCInstaller>();
                    services.AddHostedService<AgentService>();

                    // Логируем после создания Config (но не в конструкторе)
                    try
                    {
                        using (var eventLog = new System.Diagnostics.EventLog("Application"))
                        {
                            eventLog.Source = "1CUpdaterAgent";
                            eventLog.WriteEntry(
                                $"Config создан: PcId={config.PcId}, ServerUrl={config.ServerUrl}",
                                System.Diagnostics.EventLogEntryType.Information,
                                1005
                            );
                        }
                    }
                    catch { }
                    
                    // Логируем завершение настройки сервисов
                    try
                    {
                        using (var eventLog = new System.Diagnostics.EventLog("Application"))
                        {
                            eventLog.Source = "1CUpdaterAgent";
                            eventLog.WriteEntry(
                                "Сервисы настроены, добавлен AgentService",
                                System.Diagnostics.EventLogEntryType.Information,
                                1004
                            );
                        }
                    }
                    catch { }
                })
                .ConfigureLogging(logging =>
                {
                    logging.ClearProviders();
                    logging.AddEventLog(settings =>
                    {
                        settings.SourceName = "1CUpdaterAgent";
                        settings.LogName = "Application";
                    });
                    logging.AddConsole();
                    logging.SetMinimumLevel(LogLevel.Information);
                });
    }
}


