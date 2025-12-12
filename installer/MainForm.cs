using System;
using System.Diagnostics;
using System.IO;
using System.Management;
using System.Net.Http;
using System.Reflection;
using System.Security.Principal;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace OneCUpdaterAgentInstaller
{
    public partial class MainForm : Form
    {
        private TextBox txtPcId = null!;
        private TextBox txtServerUrl = null!;
        private TextBox txtInstallPath = null!;
        private Button btnBrowsePath = null!;
        private Button btnInstall = null!;
        private Button btnUninstall = null!;
        private Button btnCancel = null!;
        private ProgressBar progressBar = null!;
        private TextBox txtLog = null!;
        private Label lblStatus = null!;
        private string logFilePath = null!;
        private string exePath = string.Empty;

        public MainForm()
        {
            InitializeComponent();
            FindAgentExe();
            UpdateInstallButtonState();
        }

        private string GetApplicationVersion()
        {
            try
            {
                var version = Assembly.GetExecutingAssembly().GetName().Version;
                if (version != null)
                {
                    return $"{version.Major}.{version.Minor}.{version.Build}";
                }
            }
            catch { }
            
            // Fallback: пытаемся прочитать из файла version.txt
            try
            {
                string? installerDir = Path.GetDirectoryName(Application.ExecutablePath);
                if (!string.IsNullOrEmpty(installerDir))
                {
                    string versionFile = Path.Combine(installerDir, "version.txt");
                    if (File.Exists(versionFile))
                    {
                        string versionText = File.ReadAllText(versionFile).Trim();
                        if (!string.IsNullOrEmpty(versionText))
                        {
                            return versionText;
                        }
                    }
                }
            }
            catch { }
            
            return "1.0.0"; // Значение по умолчанию
        }

        private void InitializeComponent()
        {
            // Получаем версию из сборки
            string appVer = GetApplicationVersion();
            this.Text = $"Установщик 1C Updater Agent v{appVer}";
            this.Size = new System.Drawing.Size(600, 580);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;

            // Определяем путь к лог файлу (будет в папке установки, но пока используем папку установщика)
            string? installerPath = Path.GetDirectoryName(Application.ExecutablePath);
            string installerName = Path.GetFileNameWithoutExtension(Application.ExecutablePath);
            // Временный путь, будет обновлен при установке
            logFilePath = Path.Combine(installerPath ?? Environment.CurrentDirectory, $"{installerName}-Install-{DateTime.Now:yyyyMMdd-HHmmss}.log");

            // Заголовок с версией
            string titleVersion = GetApplicationVersion();
            var lblTitle = new Label
            {
                Text = $"Установка 1C Updater Agent v{titleVersion}",
                Font = new System.Drawing.Font("Segoe UI", 14, System.Drawing.FontStyle.Bold),
                Location = new System.Drawing.Point(20, 20),
                Size = new System.Drawing.Size(550, 30),
                TextAlign = System.Drawing.ContentAlignment.MiddleLeft
            };
            this.Controls.Add(lblTitle);

            // PC ID
            var lblPcId = new Label
            {
                Text = "ID ПК:",
                Location = new System.Drawing.Point(20, 70),
                Size = new System.Drawing.Size(100, 23)
            };
            this.Controls.Add(lblPcId);

            txtPcId = new TextBox
            {
                Location = new System.Drawing.Point(130, 67),
                Size = new System.Drawing.Size(430, 23),
                TabIndex = 0
            };
            this.Controls.Add(txtPcId);

            // Server URL
            var lblServerUrl = new Label
            {
                Text = "URL сервера:",
                Location = new System.Drawing.Point(20, 110),
                Size = new System.Drawing.Size(100, 23)
            };
            this.Controls.Add(lblServerUrl);

            txtServerUrl = new TextBox
            {
                Location = new System.Drawing.Point(130, 107),
                Size = new System.Drawing.Size(430, 23),
                Text = "http://192.168.25.200:3001",
                TabIndex = 1
            };
            this.Controls.Add(txtServerUrl);

            // Путь установки
            var lblInstallPath = new Label
            {
                Text = "Папка установки:",
                Location = new System.Drawing.Point(20, 150),
                Size = new System.Drawing.Size(100, 23)
            };
            this.Controls.Add(lblInstallPath);

            txtInstallPath = new TextBox
            {
                Location = new System.Drawing.Point(130, 147),
                Size = new System.Drawing.Size(350, 23),
                Text = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "1CUpdaterAgent"),
                TabIndex = 2
            };
            this.Controls.Add(txtInstallPath);

            btnBrowsePath = new Button
            {
                Text = "Обзор...",
                Location = new System.Drawing.Point(490, 145),
                Size = new System.Drawing.Size(70, 25),
                TabIndex = 3,
                UseVisualStyleBackColor = true
            };
            btnBrowsePath.Click += BtnBrowsePath_Click;
            this.Controls.Add(btnBrowsePath);

            // Кнопки
            btnInstall = new Button
            {
                Text = "Установить",
                Location = new System.Drawing.Point(250, 450),
                Size = new System.Drawing.Size(100, 35),
                TabIndex = 4,
                UseVisualStyleBackColor = true
            };
            btnInstall.Click += BtnInstall_Click;
            this.Controls.Add(btnInstall);

            btnUninstall = new Button
            {
                Text = "Удалить",
                Location = new System.Drawing.Point(360, 450),
                Size = new System.Drawing.Size(100, 35),
                TabIndex = 5,
                UseVisualStyleBackColor = true
            };
            btnUninstall.Click += BtnUninstall_Click;
            this.Controls.Add(btnUninstall);

            btnCancel = new Button
            {
                Text = "Отмена",
                Location = new System.Drawing.Point(470, 450),
                Size = new System.Drawing.Size(100, 35),
                TabIndex = 6,
                UseVisualStyleBackColor = true
            };
            btnCancel.Click += (s, e) => Close();
            this.Controls.Add(btnCancel);

            // Прогресс
            progressBar = new ProgressBar
            {
                Location = new System.Drawing.Point(20, 190),
                Size = new System.Drawing.Size(560, 23),
                Style = ProgressBarStyle.Continuous
            };
            this.Controls.Add(progressBar);

            // Статус
            lblStatus = new Label
            {
                Text = "Готов к установке",
                Location = new System.Drawing.Point(20, 220),
                Size = new System.Drawing.Size(560, 23)
            };
            this.Controls.Add(lblStatus);

            // Лог
            var lblLog = new Label
            {
                Text = "Лог установки:",
                Location = new System.Drawing.Point(20, 250),
                Size = new System.Drawing.Size(560, 23)
            };
            this.Controls.Add(lblLog);

            txtLog = new TextBox
            {
                Location = new System.Drawing.Point(20, 275),
                Size = new System.Drawing.Size(560, 150),
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                Font = new System.Drawing.Font("Consolas", 9)
            };
            this.Controls.Add(txtLog);
        }


        private void FindAgentExe()
        {
            string? installerDir = Path.GetDirectoryName(Application.ExecutablePath);
            if (string.IsNullOrEmpty(installerDir))
            {
                installerDir = Environment.CurrentDirectory;
            }
            
            // Ищем в той же папке
            exePath = Path.Combine(installerDir, "1CUpdaterAgent.exe");
            if (File.Exists(exePath))
            {
                WriteLog($"Найден exe файл: {exePath}");
                return;
            }

            // Ищем в подпапках
            string[] searchPaths = {
                Path.Combine(installerDir, "bin", "Release", "net8.0", "1CUpdaterAgent.exe"),
                Path.Combine(installerDir, "bin", "Debug", "net8.0", "1CUpdaterAgent.exe")
            };

            foreach (string path in searchPaths)
            {
                if (File.Exists(path))
                {
                    exePath = path;
                    WriteLog($"Найден exe файл: {exePath}");
                    return;
                }
            }

            WriteLog("Файл 1CUpdaterAgent.exe не найден локально");
            WriteLog("Будет попытка скачать с сервера при установке");
            // Путь для скачивания будет определен в BtnInstall_Click в папке установки
            exePath = string.Empty;
        }

        private void UpdateInstallButtonState()
        {
            // Кнопка установки активна, даже если файл не найден (будет скачан)
            btnInstall.Enabled = true;
        }

        private void WriteLog(string message, bool isError = false)
        {
            string timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
            string level = isError ? "ERROR" : "INFO";
            string logMessage = $"[{timestamp}] [{level}] {message}";

            // Вывод в текстовое поле
            if (txtLog.InvokeRequired)
            {
                txtLog.Invoke(new Action(() =>
                {
                    txtLog.AppendText(logMessage + Environment.NewLine);
                    txtLog.SelectionStart = txtLog.Text.Length;
                    txtLog.ScrollToCaret();
                }));
            }
            else
            {
                txtLog.AppendText(logMessage + Environment.NewLine);
                txtLog.SelectionStart = txtLog.Text.Length;
                txtLog.ScrollToCaret();
            }

            // Запись в файл
            try
            {
                File.AppendAllText(logFilePath, logMessage + Environment.NewLine, Encoding.UTF8);
            }
            catch
            {
                // Игнорируем ошибки записи в лог
            }
        }

        private void UpdateStatus(string status)
        {
            if (lblStatus.InvokeRequired)
            {
                lblStatus.Invoke(new Action(() => lblStatus.Text = status));
            }
            else
            {
                lblStatus.Text = status;
            }
        }

        private void UpdateProgress(int value)
        {
            if (progressBar.InvokeRequired)
            {
                progressBar.Invoke(new Action(() => progressBar.Value = value));
            }
            else
            {
                progressBar.Value = value;
            }
        }

        private async void BtnInstall_Click(object sender, EventArgs e)
        {
            btnInstall.Enabled = false;
            btnCancel.Enabled = false;
            progressBar.Value = 0;
            txtLog.Clear();

            WriteLog("=== Начало установки 1C Updater Agent ===");
            WriteLog($"Лог файл: {logFilePath}");
            WriteLog($"Exe файл: {exePath}");

            try
            {
                // Валидация
                if (!int.TryParse(txtPcId.Text, out int pcId) || pcId <= 0)
                {
                    WriteLog("ОШИБКА: Неверный ID ПК!", true);
                    MessageBox.Show("Введите корректный ID ПК (положительное число)", "Ошибка", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    btnInstall.Enabled = true;
                    btnCancel.Enabled = true;
                    return;
                }

                if (string.IsNullOrWhiteSpace(txtServerUrl.Text))
                {
                    WriteLog("ОШИБКА: URL сервера не указан!", true);
                    MessageBox.Show("Введите URL сервера", "Ошибка", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    btnInstall.Enabled = true;
                    btnCancel.Enabled = true;
                    return;
                }

                string serverUrl = txtServerUrl.Text.Trim();
                
                // Определяем папку установки
                string installDir = txtInstallPath.Text.Trim();
                if (string.IsNullOrEmpty(installDir))
                {
                    string programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
                    installDir = Path.Combine(programFiles, "1CUpdaterAgent");
                    txtInstallPath.Text = installDir;
                }
                
                // Обновляем путь к лог файлу - теперь в папке установки
                string installerName = Path.GetFileNameWithoutExtension(Application.ExecutablePath);
                logFilePath = Path.Combine(installDir, $"{installerName}-Install-{DateTime.Now:yyyyMMdd-HHmmss}.log");
                WriteLog($"Лог файл обновлен: {logFilePath}");
                
                // Создаем папку установки, если её нет
                if (!Directory.Exists(installDir))
                {
                    Directory.CreateDirectory(installDir);
                    WriteLog($"Папка установки создана: {installDir}");
                }

                // Если файл не найден, пытаемся скачать с сервера в папку установки
                if (string.IsNullOrEmpty(exePath) || !File.Exists(exePath))
                {
                    // Устанавливаем путь для скачивания в папку установки
                    exePath = Path.Combine(installDir, "1CUpdaterAgent.exe");
                    
                    WriteLog("Файл 1CUpdaterAgent.exe не найден локально, скачиваем с сервера...");
                    WriteLog($"Файл будет скачан в: {exePath}");
                    UpdateStatus("Скачивание файла агента...");
                    await DownloadAgentExe(serverUrl);
                    
                    if (!File.Exists(exePath))
                    {
                        WriteLog("ОШИБКА: Не удалось скачать файл 1CUpdaterAgent.exe!", true);
                        MessageBox.Show(
                            "Не удалось скачать файл 1CUpdaterAgent.exe с сервера.\n\n" +
                            "Убедитесь, что:\n" +
                            "1. URL сервера указан правильно\n" +
                            "2. Сервер доступен\n" +
                            "3. Файл агента собран на сервере\n\n" +
                            "Или поместите файл 1CUpdaterAgent.exe в ту же папку, что и установщик.",
                            "Ошибка скачивания",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Error);
                        btnInstall.Enabled = true;
                        btnCancel.Enabled = true;
                        return;
                    }
                    
                    WriteLog($"✅ Файл успешно скачан: {exePath}");
                }
                string serviceName = "1CUpdaterAgent";

                // Установка Visual C++ Redistributable (если требуется)
                UpdateProgress(5);
                UpdateStatus("Проверка Visual C++ Redistributable...");
                await InstallVCRedistributable();

                UpdateProgress(10);
                UpdateStatus("Остановка существующего сервиса...");
                await StopAndDeleteService(serviceName);

                UpdateProgress(30);
                
                // Проверяем, нужно ли копировать файл
                string systemExePath;
                string targetInstallDir = txtInstallPath.Text.Trim();
                string targetPath = Path.Combine(targetInstallDir, "1CUpdaterAgent.exe");
                
                // Если файл уже в папке установки, не копируем
                if (Path.GetFullPath(exePath).Equals(Path.GetFullPath(targetPath), StringComparison.OrdinalIgnoreCase))
                {
                    WriteLog($"Агент уже в папке установки: {exePath}");
                    systemExePath = exePath;
                }
                else
                {
                    UpdateStatus("Копирование файла агента в папку установки...");
                    systemExePath = await CopyAgentToSystemFolder(exePath);
                }

                UpdateProgress(40);
                UpdateStatus("Создание службы...");
                await CreateService(serviceName, systemExePath);

                UpdateProgress(50);
                UpdateStatus("Создание конфигурации...");
                await CreateConfig(pcId, serverUrl);

                UpdateProgress(70);
                UpdateStatus("Запуск службы...");
                await StartService(serviceName);

                UpdateProgress(100);
                UpdateStatus("Установка завершена успешно!");
                WriteLog("=== Установка завершена успешно ===");
                WriteLog($"Лог сохранен в: {logFilePath}");

                MessageBox.Show(
                    "Служба успешно установлена и запущена!\n\n" +
                    $"Лог установки: {logFilePath}",
                    "Установка завершена",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);

                Close();
            }
            catch (Exception ex)
            {
                WriteLog($"ОШИБКА установки: {ex.Message}", true);
                WriteLog($"Детали: {ex}", true);
                UpdateStatus("Ошибка установки");
                MessageBox.Show(
                    $"Ошибка установки: {ex.Message}\n\n" +
                    $"Детали в логе: {logFilePath}",
                    "Ошибка",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                btnInstall.Enabled = true;
                btnCancel.Enabled = true;
            }
        }

        private async Task StopAndDeleteService(string serviceName)
        {
            WriteLog($"Проверка существующего сервиса: {serviceName}");
            
            try
            {
                using (var searcher = new ManagementObjectSearcher($"SELECT * FROM Win32_Service WHERE Name='{serviceName}'"))
                {
                    var services = searcher.Get();
                    if (services.Count > 0)
                    {
                        WriteLog("Найден существующий сервис");
                        foreach (ManagementObject service in services)
                        {
                            string state = service["State"]?.ToString() ?? "Unknown";
                            WriteLog($"Статус сервиса: {state}");

                            if (state == "Running")
                            {
                                WriteLog("Остановка сервиса...");
                                service.InvokeMethod("StopService", null);
                                
                                // Ждем остановки
                                int attempts = 0;
                                while (attempts < 10)
                                {
                                    await Task.Delay(500);
                                    service.Get();
                                    state = service["State"]?.ToString() ?? "Unknown";
                                    if (state != "Running") break;
                                    attempts++;
                                }
                                WriteLog($"Сервис остановлен (попыток: {attempts + 1})");
                            }

                            WriteLog("Удаление сервиса...");
                            service.InvokeMethod("Delete", null);
                            WriteLog("Сервис удален");
                        }
                    }
                    else
                    {
                        WriteLog("Существующий сервис не найден");
                    }
                }
            }
            catch (Exception ex)
            {
                WriteLog($"Предупреждение при удалении сервиса: {ex.Message}", true);
            }
        }

        private async Task CreateService(string serviceName, string exePath)
        {
            WriteLog($"Создание службы: {serviceName}");
            WriteLog($"Путь к exe: {exePath}");

            try
            {
                using (var process = new Process())
                {
                    process.StartInfo = new ProcessStartInfo
                    {
                        FileName = "sc.exe",
                        Arguments = $"create {serviceName} binPath= \"{exePath}\" DisplayName= \"1C Updater Agent\" start= auto",
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        CreateNoWindow = true
                    };

                    process.Start();
                    string output = await process.StandardOutput.ReadToEndAsync();
                    string error = await process.StandardError.ReadToEndAsync();
                    await process.WaitForExitAsync();

                    if (process.ExitCode == 0)
                    {
                        WriteLog("Служба создана успешно");
                        WriteLog($"Вывод: {output}");
                    }
                    else
                    {
                        throw new Exception($"Не удалось создать службу. Код: {process.ExitCode}, Ошибка: {error}");
                    }
                }

                // Установка описания
                using (var process = new Process())
                {
                    process.StartInfo = new ProcessStartInfo
                    {
                        FileName = "sc.exe",
                        Arguments = $"description {serviceName} \"Сервис для автоматической установки обновлений 1С на удаленных ПК\"",
                        UseShellExecute = false,
                        CreateNoWindow = true
                    };
                    process.Start();
                    await process.WaitForExitAsync();
                }
            }
            catch (Exception ex)
            {
                WriteLog($"Ошибка создания службы: {ex.Message}", true);
                throw;
            }
        }

        private async Task CreateConfig(int pcId, string serverUrl)
        {
            WriteLog("Создание конфигурационного файла...");
            
            string configDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "1CUpdaterAgent");
            WriteLog($"Директория конфигурации: {configDir}");

            try
            {
                if (!Directory.Exists(configDir))
                {
                    Directory.CreateDirectory(configDir);
                    WriteLog("Директория создана");
                }

                string configPath = Path.Combine(configDir, "config.json");
                string agentId = Guid.NewGuid().ToString();

                var config = new
                {
                    ServerUrl = serverUrl,
                    PcId = pcId,
                    AgentId = agentId,
                    PollIntervalSeconds = 30,
                    HeartbeatIntervalSeconds = 60
                };

                string json = System.Text.Json.JsonSerializer.Serialize(config, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
                await File.WriteAllTextAsync(configPath, json, Encoding.UTF8);

                WriteLog($"Конфигурация сохранена: {configPath}");
                WriteLog($"AgentId: {agentId}");
            }
            catch (Exception ex)
            {
                WriteLog($"Ошибка создания конфигурации: {ex.Message}", true);
                throw;
            }
        }

        private async Task StartService(string serviceName)
        {
            WriteLog("Запуск службы...");

            try
            {
                using (var process = new Process())
                {
                    process.StartInfo = new ProcessStartInfo
                    {
                        FileName = "sc.exe",
                        Arguments = $"start {serviceName}",
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        CreateNoWindow = true
                    };

                    process.Start();
                    string output = await process.StandardOutput.ReadToEndAsync();
                    string error = await process.StandardError.ReadToEndAsync();
                    await process.WaitForExitAsync();

                    WriteLog($"Код выхода sc.exe: {process.ExitCode}");
                    WriteLog($"Вывод: {output}");
                    if (!string.IsNullOrEmpty(error))
                    {
                        WriteLog($"Ошибка: {error}");
                    }

                    if (process.ExitCode == 0)
                    {
                        WriteLog("Команда запуска службы выполнена успешно");
                        WriteLog("Ожидание инициализации службы (5 секунд)...");
                        await Task.Delay(5000); // Увеличиваем задержку для инициализации

                        // Проверяем статус
                        using (var searcher = new ManagementObjectSearcher($"SELECT * FROM Win32_Service WHERE Name='{serviceName}'"))
                        {
                            var services = searcher.Get();
                            foreach (ManagementObject service in services)
                            {
                                string state = service["State"]?.ToString() ?? "Unknown";
                                string exitCode = service["ExitCode"]?.ToString() ?? "N/A";
                                WriteLog($"Статус службы: {state}, ExitCode: {exitCode}");
                                
                                if (state == "Running")
                                {
                                    WriteLog("✅ Служба успешно запущена");
                                }
                                else if (state == "Stopped")
                                {
                                    WriteLog("⚠️ Служба остановлена", true);
                                    // Проверяем EventLog на наличие ошибок
                                    CheckEventLogForErrors(serviceName);
                                }
                                else
                                {
                                    WriteLog($"⚠️ Служба в состоянии: {state}", true);
                                    CheckEventLogForErrors(serviceName);
                                }
                            }
                        }
                    }
                    else
                    {
                        WriteLog($"Ошибка запуска службы. Код: {process.ExitCode}", true);
                        CheckEventLogForErrors(serviceName);
                        throw new Exception($"Не удалось запустить службу. Код: {process.ExitCode}, Ошибка: {error}");
                    }
                }
            }
            catch (Exception ex)
            {
                WriteLog($"Ошибка запуска службы: {ex.Message}", true);
                throw;
            }
        }

        private async Task InstallVCRedistributable()
        {
            try
            {
                // Проверяем, установлен ли VC++ Redistributable
                if (IsVCRedistributableInstalled())
                {
                    WriteLog("Visual C++ Redistributable уже установлен");
                    return;
                }

                WriteLog("Visual C++ Redistributable не найден, начинаем установку...");

                // Получаем путь к временной папке
                string tempPath = Path.GetTempPath();
                string vcRedistPath = Path.Combine(tempPath, "vc_redist.x64.exe");

                // Пытаемся извлечь из встроенных ресурсов
                bool extracted = ExtractEmbeddedVCRedistributable(vcRedistPath);

                // Если не удалось извлечь, скачиваем
                if (!extracted)
                {
                    WriteLog("Встроенный установщик не найден, скачиваем с официального сайта...");
                    await DownloadVCRedistributable(vcRedistPath);
                }

                if (!File.Exists(vcRedistPath))
                {
                    WriteLog("⚠️ Не удалось получить установщик VC++ Redistributable", true);
                    WriteLog("Попробуйте установить его вручную: https://aka.ms/vs/17/release/vc_redist.x64.exe", true);
                    return;
                }

                WriteLog($"Установка VC++ Redistributable из: {vcRedistPath}");

                // Устанавливаем VC++ Redistributable
                using (var process = new Process())
                {
                    process.StartInfo = new ProcessStartInfo
                    {
                        FileName = vcRedistPath,
                        Arguments = "/quiet /norestart",
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        CreateNoWindow = true
                    };

                    process.Start();
                    await process.WaitForExitAsync();

                    if (process.ExitCode == 0 || process.ExitCode == 3010) // 3010 = успешная установка с перезагрузкой
                    {
                        WriteLog("✅ Visual C++ Redistributable успешно установлен");
                    }
                    else
                    {
                        WriteLog($"⚠️ VC++ Redistributable установлен с кодом: {process.ExitCode}", true);
                    }
                }

                // Удаляем временный файл
                try
                {
                    if (File.Exists(vcRedistPath))
                    {
                        File.Delete(vcRedistPath);
                    }
                }
                catch
                {
                    // Игнорируем ошибки удаления
                }
            }
            catch (Exception ex)
            {
                WriteLog($"⚠️ Ошибка при установке VC++ Redistributable: {ex.Message}", true);
                WriteLog("Попробуйте установить его вручную: https://aka.ms/vs/17/release/vc_redist.x64.exe", true);
                // Не прерываем установку, продолжаем
            }
        }

        private bool IsVCRedistributableInstalled()
        {
            try
            {
                // Проверяем наличие ключа реестра для VC++ Redistributable 2015-2022
                using (var key = Microsoft.Win32.Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64"))
                {
                    if (key != null)
                    {
                        var version = key.GetValue("Version")?.ToString();
                        if (!string.IsNullOrEmpty(version))
                        {
                            return true;
                        }
                    }
                }

                // Альтернативная проверка через WMI
                try
                {
                    using (var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_Product WHERE Name LIKE '%Visual C++%Redistributable%'"))
                    {
                        var products = searcher.Get();
                        foreach (ManagementObject product in products)
                        {
                            string name = product["Name"]?.ToString() ?? "";
                            if (name.Contains("2015") || name.Contains("2017") || name.Contains("2019") || name.Contains("2022"))
                            {
                                return true;
                            }
                        }
                    }
                }
                catch
                {
                    // Игнорируем ошибки WMI
                }

                return false;
            }
            catch
            {
                return false;
            }
        }

        private bool ExtractEmbeddedVCRedistributable(string targetPath)
        {
            try
            {
                var assembly = Assembly.GetExecutingAssembly();
                string resourceName = "OneCUpdaterAgentInstaller.Resources.vc_redist.x64.exe";

                using (Stream? stream = assembly.GetManifestResourceStream(resourceName))
                {
                    if (stream != null)
                    {
                        using (var fileStream = new FileStream(targetPath, FileMode.Create))
                        {
                            stream.CopyTo(fileStream);
                        }
                        WriteLog("Встроенный установщик VC++ Redistributable извлечен");
                        return true;
                    }
                }
            }
            catch (Exception ex)
            {
                WriteLog($"Не удалось извлечь встроенный установщик: {ex.Message}");
            }

            return false;
        }

        private async Task DownloadVCRedistributable(string targetPath)
        {
            try
            {
                string downloadUrl = "https://aka.ms/vs/17/release/vc_redist.x64.exe";
                WriteLog($"Скачивание VC++ Redistributable с: {downloadUrl}");

                using (var httpClient = new HttpClient())
                {
                    httpClient.Timeout = TimeSpan.FromMinutes(5);
                    var response = await httpClient.GetAsync(downloadUrl);
                    response.EnsureSuccessStatusCode();

                    using (var fileStream = new FileStream(targetPath, FileMode.Create))
                    {
                        await response.Content.CopyToAsync(fileStream);
                    }

                    WriteLog("VC++ Redistributable успешно скачан");
                }
            }
            catch (Exception ex)
            {
                WriteLog($"Ошибка скачивания VC++ Redistributable: {ex.Message}", true);
                throw;
            }
        }

        private async Task DownloadAgentExe(string serverUrl)
        {
            try
            {
                // Убеждаемся, что папка существует
                string? targetDir = Path.GetDirectoryName(exePath);
                if (!string.IsNullOrEmpty(targetDir) && !Directory.Exists(targetDir))
                {
                    Directory.CreateDirectory(targetDir);
                    WriteLog($"Создана папка для скачивания: {targetDir}");
                }
                
                // Формируем URL для скачивания
                string downloadUrl = serverUrl.TrimEnd('/') + "/api/agent/download-exe";
                WriteLog($"Скачивание агента с: {downloadUrl}");
                WriteLog($"Сохранение в: {exePath}");

                using (var httpClient = new HttpClient())
                {
                    httpClient.Timeout = TimeSpan.FromMinutes(5);
                    var response = await httpClient.GetAsync(downloadUrl);
                    response.EnsureSuccessStatusCode();

                    using (var fileStream = new FileStream(exePath, FileMode.Create))
                    {
                        await response.Content.CopyToAsync(fileStream);
                    }

                    WriteLog($"✅ Агент успешно скачан: {exePath}");
                    
                    // Проверяем размер файла
                    if (File.Exists(exePath))
                    {
                        var fileInfo = new FileInfo(exePath);
                        WriteLog($"Размер скачанного файла: {fileInfo.Length} байт ({Math.Round(fileInfo.Length / 1024.0 / 1024.0, 2)} MB)");
                    }
                }
            }
            catch (Exception ex)
            {
                WriteLog($"Ошибка скачивания агента: {ex.Message}", true);
                throw;
            }
        }

        private void BtnBrowsePath_Click(object sender, EventArgs e)
        {
            using (var dialog = new FolderBrowserDialog())
            {
                dialog.Description = "Выберите папку для установки агента";
                dialog.SelectedPath = txtInstallPath.Text;
                dialog.ShowNewFolderButton = true;

                if (dialog.ShowDialog() == DialogResult.OK)
                {
                    txtInstallPath.Text = dialog.SelectedPath;
                }
            }
        }

        private async void BtnUninstall_Click(object sender, EventArgs e)
        {
            var result = MessageBox.Show(
                "Вы уверены, что хотите удалить 1C Updater Agent?\n\n" +
                "Будет удалено:\n" +
                "- Служба Windows\n" +
                "- Файлы агента\n" +
                "- Конфигурация",
                "Подтверждение удаления",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Warning);

            if (result != DialogResult.Yes)
            {
                return;
            }

            btnUninstall.Enabled = false;
            btnInstall.Enabled = false;
            btnCancel.Enabled = false;
            progressBar.Value = 0;
            txtLog.Clear();

            WriteLog("=== Начало удаления 1C Updater Agent ===");

            try
            {
                string serviceName = "1CUpdaterAgent";

                UpdateProgress(20);
                UpdateStatus("Остановка службы...");
                await StopAndDeleteService(serviceName);

                UpdateProgress(40);
                UpdateStatus("Удаление файлов агента...");
                await DeleteAgentFiles();

                UpdateProgress(60);
                UpdateStatus("Удаление конфигурации...");
                await DeleteConfig();

                UpdateProgress(100);
                UpdateStatus("Удаление завершено успешно!");
                WriteLog("=== Удаление завершено успешно ===");

                MessageBox.Show(
                    "1C Updater Agent успешно удален!",
                    "Удаление завершено",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);

                Close();
            }
            catch (Exception ex)
            {
                WriteLog($"ОШИБКА удаления: {ex.Message}", true);
                WriteLog($"Детали: {ex}", true);
                UpdateStatus("Ошибка удаления");
                MessageBox.Show(
                    $"Ошибка удаления: {ex.Message}\n\n" +
                    $"Детали в логе: {logFilePath}",
                    "Ошибка",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                btnUninstall.Enabled = true;
                btnInstall.Enabled = true;
                btnCancel.Enabled = true;
            }
        }

        private Task DeleteAgentFiles()
        {
            try
            {
                string installPath = txtInstallPath.Text.Trim();
                if (string.IsNullOrEmpty(installPath))
                {
                    // Пробуем найти стандартную папку
                    installPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "1CUpdaterAgent");
                }

                if (Directory.Exists(installPath))
                {
                    WriteLog($"Удаление папки: {installPath}");

                    // Пытаемся удалить файлы
                    try
                    {
                        Directory.Delete(installPath, true);
                        WriteLog("✅ Папка агента удалена");
                    }
                    catch (Exception ex)
                    {
                        WriteLog($"⚠️ Не удалось удалить папку: {ex.Message}", true);
                        WriteLog("Попробуйте удалить вручную после перезагрузки");
                    }
                }
                else
                {
                    WriteLog($"Папка не найдена: {installPath}");
                }
            }
            catch (Exception ex)
            {
                WriteLog($"Ошибка удаления файлов: {ex.Message}", true);
                throw;
            }
            return Task.CompletedTask;
        }

        private Task DeleteConfig()
        {
            try
            {
                string configDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "1CUpdaterAgent");
                
                if (Directory.Exists(configDir))
                {
                    WriteLog($"Удаление конфигурации: {configDir}");
                    try
                    {
                        Directory.Delete(configDir, true);
                        WriteLog("✅ Конфигурация удалена");
                    }
                    catch (Exception ex)
                    {
                        WriteLog($"⚠️ Не удалось удалить конфигурацию: {ex.Message}", true);
                    }
                }
                else
                {
                    WriteLog("Конфигурация не найдена");
                }
            }
            catch (Exception ex)
            {
                WriteLog($"Ошибка удаления конфигурации: {ex.Message}", true);
            }
            return Task.CompletedTask;
        }

        private async Task<string> CopyAgentToSystemFolder(string sourcePath)
        {
            try
            {
                // Используем выбранную папку установки
                string targetDir = txtInstallPath.Text.Trim();
                if (string.IsNullOrEmpty(targetDir))
                {
                    // Если не указана, используем стандартную
                    string programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
                    targetDir = Path.Combine(programFiles, "1CUpdaterAgent");
                    txtInstallPath.Text = targetDir; // Обновляем поле
                }
                
                string targetPath = Path.Combine(targetDir, "1CUpdaterAgent.exe");
                
                // Проверяем, не пытаемся ли мы скопировать файл сам в себя
                if (Path.GetFullPath(sourcePath).Equals(Path.GetFullPath(targetPath), StringComparison.OrdinalIgnoreCase))
                {
                    WriteLog($"Агент уже в папке установки: {targetPath}");
                    return targetPath;
                }
                
                WriteLog($"Копирование агента в системную папку: {targetDir}");
                WriteLog($"Источник: {sourcePath}");
                WriteLog($"Назначение: {targetPath}");

                if (!Directory.Exists(targetDir))
                {
                    Directory.CreateDirectory(targetDir);
                    WriteLog("Системная папка создана");
                }

                // Проверяем, что исходный файл существует
                if (!File.Exists(sourcePath))
                {
                    throw new FileNotFoundException($"Исходный файл не найден: {sourcePath}");
                }

                // Если файл уже существует, удаляем его
                if (File.Exists(targetPath))
                {
                    WriteLog("Удаление старой версии агента...");
                    try
                    {
                        File.Delete(targetPath);
                        await Task.Delay(500); // Небольшая задержка
                    }
                    catch (Exception ex)
                    {
                        WriteLog($"Предупреждение: Не удалось удалить старую версию: {ex.Message}");
                    }
                }

                // Копируем файл
                File.Copy(sourcePath, targetPath, true);
                WriteLog($"✅ Агент скопирован: {targetPath}");

                // Проверяем, что файл существует и доступен
                if (!File.Exists(targetPath))
                {
                    throw new Exception("Файл не был скопирован");
                }

                // Проверяем размер файла
                var fileInfo = new FileInfo(targetPath);
                WriteLog($"Размер файла: {fileInfo.Length} байт");

                return targetPath;
            }
            catch (Exception ex)
            {
                WriteLog($"Ошибка копирования агента: {ex.Message}", true);
                throw;
            }
        }

        private void CheckEventLogForErrors(string serviceName)
        {
            try
            {
                WriteLog("Проверка EventLog на наличие ошибок...");
                using (var eventLog = new System.Diagnostics.EventLog("Application"))
                {
                    var entries = eventLog.Entries
                        .Cast<System.Diagnostics.EventLogEntry>()
                        .Where(e => e.Source == serviceName || e.Source == "1CUpdaterAgent")
                        .OrderByDescending(e => e.TimeWritten)
                        .Take(5)
                        .ToList();

                    if (entries.Any())
                    {
                        WriteLog($"Найдено {entries.Count} записей в EventLog:");
                        foreach (var entry in entries)
                        {
                            string level = entry.EntryType.ToString();
                            WriteLog($"[{entry.TimeWritten:yyyy-MM-dd HH:mm:ss}] [{level}] {entry.Message}", entry.EntryType == System.Diagnostics.EventLogEntryType.Error);
                        }
                    }
                    else
                    {
                        WriteLog("Записи в EventLog не найдены");
                    }
                }
            }
            catch (Exception ex)
            {
                WriteLog($"Не удалось прочитать EventLog: {ex.Message}");
            }
        }
    }
}

