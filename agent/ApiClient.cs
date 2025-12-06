using System.Net.Http.Json;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using Microsoft.Extensions.Logging;

namespace OneCUpdaterAgent
{
    public class ApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly Config _config;
        private readonly ILogger<ApiClient> _logger;

        public ApiClient(Config config, ILogger<ApiClient> logger)
        {
            _config = config;
            _logger = logger;
            
            try
            {
                _httpClient = new HttpClient
                {
                    BaseAddress = new Uri(_config.ServerUrl),
                    Timeout = TimeSpan.FromMinutes(5)
                };
            }
            catch (Exception ex)
            {
                // Логируем ошибку после инициализации DI
                _logger?.LogError(ex, $"ОШИБКА создания HttpClient: {ex.Message}");
                throw;
            }
        }
        
        public void LogInitialization()
        {
            // Логируем после полной инициализации
            try
            {
                using (var eventLog = new System.Diagnostics.EventLog("Application"))
                {
                    eventLog.Source = "1CUpdaterAgent";
                    eventLog.WriteEntry(
                        $"ApiClient создан. BaseAddress={_httpClient.BaseAddress}",
                        System.Diagnostics.EventLogEntryType.Information,
                        2501
                    );
                }
            }
            catch { }
        }

        public async Task<bool> RegisterAgentAsync(RegisterAgentRequest request)
        {
            try
            {
                // Логируем в EventLog напрямую
                try
                {
                    using (var eventLog = new System.Diagnostics.EventLog("Application"))
                    {
                        eventLog.Source = "1CUpdaterAgent";
                        eventLog.WriteEntry(
                            $"RegisterAgentAsync: PcId={request.PcId}, AgentId={request.AgentId}, ServerUrl={_config.ServerUrl}",
                            System.Diagnostics.EventLogEntryType.Information,
                            2600
                        );
                    }
                }
                catch { }

                _logger?.LogInformation($"Регистрация агента: PcId={request.PcId}, AgentId={request.AgentId}, ServerUrl={_config.ServerUrl}");
                
                // Настраиваем сериализацию для camelCase (как ожидает бэкенд)
                var settings = new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                };
                var json = JsonConvert.SerializeObject(request, settings);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var url = $"{_config.ServerUrl}/api/agent/register";
                _logger?.LogInformation($"Отправка запроса на: {url}");
                
                try
                {
                    using (var eventLog = new System.Diagnostics.EventLog("Application"))
                    {
                        eventLog.Source = "1CUpdaterAgent";
                        eventLog.WriteEntry(
                            $"Отправка POST на: {url}",
                            System.Diagnostics.EventLogEntryType.Information,
                            2601
                        );
                    }
                }
                catch { }

                var response = await _httpClient.PostAsync("/api/agent/register", content);
                var statusCode = (int)response.StatusCode;
                _logger?.LogInformation($"Ответ сервера: {statusCode} {response.ReasonPhrase}");
                
                try
                {
                    using (var eventLog = new System.Diagnostics.EventLog("Application"))
                    {
                        eventLog.Source = "1CUpdaterAgent";
                        eventLog.WriteEntry(
                            $"Ответ сервера: {statusCode} {response.ReasonPhrase}",
                            System.Diagnostics.EventLogEntryType.Information,
                            2602
                        );
                    }
                }
                catch { }
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger?.LogWarning($"Ошибка регистрации: {statusCode} - {errorContent}");
                    
                    try
                    {
                        using (var eventLog = new System.Diagnostics.EventLog("Application"))
                        {
                            eventLog.Source = "1CUpdaterAgent";
                            eventLog.WriteEntry(
                                $"ОШИБКА регистрации: {statusCode} - {errorContent}",
                                System.Diagnostics.EventLogEntryType.Error,
                                2603
                            );
                        }
                    }
                    catch { }
                }
                else
                {
                    try
                    {
                        using (var eventLog = new System.Diagnostics.EventLog("Application"))
                        {
                            eventLog.Source = "1CUpdaterAgent";
                            eventLog.WriteEntry(
                                "✅ Регистрация успешна!",
                                System.Diagnostics.EventLogEntryType.Information,
                                2604
                            );
                        }
                    }
                    catch { }
                }
                
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, $"Ошибка регистрации агента: {ex.Message}");
                
                try
                {
                    using (var eventLog = new System.Diagnostics.EventLog("Application"))
                    {
                        eventLog.Source = "1CUpdaterAgent";
                        eventLog.WriteEntry(
                            $"❌ ИСКЛЮЧЕНИЕ при регистрации: {ex.Message}\nТип: {ex.GetType().Name}\nStack: {ex.StackTrace}",
                            System.Diagnostics.EventLogEntryType.Error,
                            2605
                        );
                    }
                }
                catch { }
                
                return false;
            }
        }

        public async Task<bool> SendHeartbeatAsync(string agentId)
        {
            try
            {
                var response = await _httpClient.PostAsync($"/api/agent/heartbeat/{agentId}", null);
                var statusCode = (int)response.StatusCode;
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger?.LogWarning($"Ошибка отправки heartbeat: {statusCode} {response.ReasonPhrase}");
                    
                    try
                    {
                        using (var eventLog = new System.Diagnostics.EventLog("Application"))
                        {
                            eventLog.Source = "1CUpdaterAgent";
                            eventLog.WriteEntry(
                                $"ОШИБКА heartbeat: {statusCode} {response.ReasonPhrase}",
                                System.Diagnostics.EventLogEntryType.Warning,
                                2700
                            );
                        }
                    }
                    catch { }
                }
                
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, $"Ошибка отправки heartbeat: {ex.Message}");
                
                try
                {
                    using (var eventLog = new System.Diagnostics.EventLog("Application"))
                    {
                        eventLog.Source = "1CUpdaterAgent";
                        eventLog.WriteEntry(
                            $"❌ ИСКЛЮЧЕНИЕ при heartbeat: {ex.Message}",
                            System.Diagnostics.EventLogEntryType.Error,
                            2701
                        );
                    }
                }
                catch { }
                
                return false;
            }
        }

        public async Task<bool> UpdateStatusAsync(string agentId, UpdateStatusRequest request)
        {
            try
            {
                _logger?.LogInformation($"UpdateStatusAsync: AgentId={agentId}, Version={request.LastOneCVersion ?? "null"}, Arch={request.OneCArchitecture ?? "null"}");
                
                var settings = new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver(),
                    NullValueHandling = NullValueHandling.Include // Включаем null значения в JSON
                };
                var json = JsonConvert.SerializeObject(request, settings);
                _logger?.LogInformation($"JSON для отправки: {json}");
                
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var url = $"/api/agent/status/{agentId}";
                _logger?.LogInformation($"Отправка POST на: {_config.ServerUrl}{url}");
                
                var response = await _httpClient.PostAsync(url, content);
                var statusCode = (int)response.StatusCode;
                
                if (response.IsSuccessStatusCode)
                {
                    _logger?.LogInformation($"✅ UpdateStatus успешно: {statusCode}");
                    return true;
                }
                else
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    _logger?.LogWarning($"⚠️ UpdateStatus ошибка: {statusCode} {response.ReasonPhrase}. Ответ: {responseContent}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, $"❌ Ошибка обновления статуса: {ex.Message}");
                return false;
            }
        }

        public async Task<List<TaskResponse>> GetPendingTasksAsync(string agentId)
        {
            try
            {
                var response = await _httpClient.GetAsync($"/api/agent/tasks/{agentId}");
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync();
                    return JsonConvert.DeserializeObject<List<TaskResponse>>(json) ?? new List<TaskResponse>();
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Ошибка получения задач");
            }
            return new List<TaskResponse>();
        }

        public async Task<bool> ReportTaskProgressAsync(string agentId, int taskId, string status, string? errorMessage = null)
        {
            try
            {
                var request = new
                {
                    status = status,
                    errorMessage = errorMessage
                };
                var settings = new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                };
                var json = JsonConvert.SerializeObject(request, settings);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync($"/api/agent/tasks/{agentId}/{taskId}/progress", content);
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Ошибка отправки прогресса задачи");
                return false;
            }
        }

        public async Task<byte[]> DownloadDistributionAsync(int distributionId)
        {
            try
            {
                var response = await _httpClient.GetAsync($"/api/distributions/{distributionId}/download");
                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadAsByteArrayAsync();
                }
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Ошибка загрузки дистрибутива");
            }
            return Array.Empty<byte>();
        }
    }

    public class RegisterAgentRequest
    {
        public int PcId { get; set; }
        public string AgentId { get; set; } = string.Empty;
        public string Hostname { get; set; } = string.Empty;
        public string OsVersion { get; set; } = string.Empty;
        public string? LastOneCVersion { get; set; }
        public string? OneCArchitecture { get; set; }
    }

    public class UpdateStatusRequest
    {
        public string? LastOneCVersion { get; set; }
        public string? OneCArchitecture { get; set; }
    }

    public class TaskResponse
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public DistributionInfo Distribution { get; set; } = new();
    }

    public class DistributionInfo
    {
        public int Id { get; set; }
        public string Filename { get; set; } = string.Empty;
        public string Version { get; set; } = string.Empty;
        public string Architecture { get; set; } = string.Empty;
    }
}



