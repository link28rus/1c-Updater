using System.Management;
using System.IO;
using Microsoft.Extensions.Logging;

namespace OneCUpdaterAgent
{
    public class WmiHelper
    {
        private readonly ILogger<WmiHelper>? _logger;

        public WmiHelper(ILogger<WmiHelper>? logger = null)
        {
            _logger = logger;
        }

        public bool IsPcOnline()
        {
            // Проверка доступности ПК через WMI
            try
            {
                var scope = new ManagementScope(@"\\.\root\cimv2");
                scope.Connect();
                return true;
            }
            catch
            {
                return false;
            }
        }

        private OneCDetector? _oneCDetector;

        public string? GetOneCVersion()
        {
            try
            {
                // Логируем начало вызова
                try
                {
                    using (var eventLog = new System.Diagnostics.EventLog("Application"))
                    {
                        eventLog.Source = "1CUpdaterAgent";
                        eventLog.WriteEntry("[WmiHelper] GetOneCVersion called, calling GetLatest1CVersion()", System.Diagnostics.EventLogEntryType.Information, 5002);
                    }
                }
                catch { }
                
                // Используем новый метод, который ищет в стандартных путях Uninstall реестра
                var latestVersion = OneCDetector.GetLatest1CVersion(_logger);
                
                // Логируем результат
                try
                {
                    using (var eventLog = new System.Diagnostics.EventLog("Application"))
                    {
                        eventLog.Source = "1CUpdaterAgent";
                        var resultMsg = latestVersion != null 
                            ? $"[WmiHelper] GetLatest1CVersion returned: {latestVersion}" 
                            : "[WmiHelper] GetLatest1CVersion returned: null";
                        eventLog.WriteEntry(resultMsg, System.Diagnostics.EventLogEntryType.Information, 5003);
                    }
                }
                catch { }
                
                if (latestVersion != null)
                {
                    var message = $"✅ 1С найдена: Version={latestVersion}";
                    System.Diagnostics.Debug.WriteLine(message);
                    
                    try
                    {
                        using (var eventLog = new System.Diagnostics.EventLog("Application"))
                        {
                            eventLog.Source = "1CUpdaterAgent";
                            eventLog.WriteEntry(message, System.Diagnostics.EventLogEntryType.Information, 4001);
                        }
                    }
                    catch { }
                    
                    return latestVersion;
                }
                else
                {
                    var message = "⚠️ 1С не найдена в реестре";
                    System.Diagnostics.Debug.WriteLine(message);
                    
                    try
                    {
                        using (var eventLog = new System.Diagnostics.EventLog("Application"))
                        {
                            eventLog.Source = "1CUpdaterAgent";
                            eventLog.WriteEntry(message, System.Diagnostics.EventLogEntryType.Warning, 4002);
                        }
                    }
                    catch { }
                    
                    return null;
                }
            }
            catch (Exception ex)
            {
                var message = $"❌ Ошибка получения версии 1С: {ex.Message}";
                System.Diagnostics.Debug.WriteLine(message);
                
                try
                {
                    using (var eventLog = new System.Diagnostics.EventLog("Application"))
                    {
                        eventLog.Source = "1CUpdaterAgent";
                        eventLog.WriteEntry(message, System.Diagnostics.EventLogEntryType.Error, 4003);
                    }
                }
                catch { }
                
                return null;
            }
        }

        public string? GetOneCArchitecture()
        {
            try
            {
                _oneCDetector ??= new OneCDetector();
                var installation = _oneCDetector.GetLatestInstallation();
                
                // Возвращаем null, если 1С не найдена (не устанавливаем значение по умолчанию)
                if (installation == null)
                {
                    return null;
                }
                
                return installation.Edition;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Ошибка определения архитектуры: {ex.Message}");
                return null; // Возвращаем null при ошибке, чтобы не показывать неверную архитектуру
            }
        }

        public string GetHostname()
        {
            return Environment.MachineName;
        }

        public string GetOsVersion()
        {
            return Environment.OSVersion.ToString();
        }
    }
}


