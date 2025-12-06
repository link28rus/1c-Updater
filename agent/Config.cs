namespace OneCUpdaterAgent
{
    public class Config
    {
        public string ServerUrl { get; set; } = "http://localhost:3001";
        public int PcId { get; set; } = 0;
        public string AgentId { get; set; } = Guid.NewGuid().ToString();
        public int PollIntervalSeconds { get; set; } = 30;
        public int HeartbeatIntervalSeconds { get; set; } = 60;

        public Config()
        {
            // НЕ логируем в конструкторе - это может вызвать проблемы при инициализации DI
            LoadFromFile();
        }
        
        public void LogConfigLoaded()
        {
            // Логируем загруженную конфигурацию после полной инициализации
            try
            {
                using (var eventLog = new System.Diagnostics.EventLog("Application"))
                {
                    eventLog.Source = "1CUpdaterAgent";
                    eventLog.WriteEntry(
                        $"Config загружен: PcId={PcId}, AgentId={AgentId}, ServerUrl={ServerUrl}",
                        System.Diagnostics.EventLogEntryType.Information,
                        1501
                    );
                }
            }
            catch { }
        }

        private void LoadFromFile()
        {
            var configPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                "1CUpdaterAgent",
                "config.json"
            );

            if (File.Exists(configPath))
            {
                try
                {
                    var json = File.ReadAllText(configPath);
                    
                    // Используем JsonDocument для избежания рекурсии при десериализации
                    using (var doc = System.Text.Json.JsonDocument.Parse(json))
                    {
                        var root = doc.RootElement;
                        
                        if (root.TryGetProperty("ServerUrl", out var serverUrlProp))
                            ServerUrl = serverUrlProp.GetString() ?? ServerUrl;
                            
                        if (root.TryGetProperty("PcId", out var pcIdProp))
                            PcId = pcIdProp.GetInt32();
                            
                        if (root.TryGetProperty("AgentId", out var agentIdProp))
                            AgentId = agentIdProp.GetString() ?? AgentId;
                            
                        if (root.TryGetProperty("PollIntervalSeconds", out var pollIntervalProp))
                            PollIntervalSeconds = pollIntervalProp.GetInt32();
                            
                        if (root.TryGetProperty("HeartbeatIntervalSeconds", out var heartbeatIntervalProp))
                            HeartbeatIntervalSeconds = heartbeatIntervalProp.GetInt32();
                    }
                }
                catch (Exception ex)
                {
                    // НЕ логируем в конструкторе - это может вызвать проблемы
                    System.Diagnostics.Debug.WriteLine($"Ошибка загрузки конфига: {ex.Message}");
                }
            }
        }

        public void SaveToFile()
        {
            var configDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
                "1CUpdaterAgent"
            );

            if (!Directory.Exists(configDir))
            {
                Directory.CreateDirectory(configDir);
            }

            var configPath = Path.Combine(configDir, "config.json");
            var json = System.Text.Json.JsonSerializer.Serialize(this, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(configPath, json);
        }
    }
}


