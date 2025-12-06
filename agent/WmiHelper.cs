using System.Management;
using System.IO;

namespace OneCUpdaterAgent
{
    public class WmiHelper
    {
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
                _oneCDetector ??= new OneCDetector();
                var installation = _oneCDetector.GetLatestInstallation();
                
                if (installation != null)
                {
                    var message = $"✅ 1С найдена: Version={installation.Version}, Path={installation.Path}, Edition={installation.Edition}";
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
                    
                    return installation.Version;
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


