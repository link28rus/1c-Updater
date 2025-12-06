using System;
using System.Diagnostics;
using System.Security.Principal;
using System.Windows.Forms;

namespace OneCUpdaterAgentInstaller
{
    internal static class Program
    {
        [STAThread]
        static void Main()
        {
            // Проверяем права администратора
            if (!IsRunAsAdministrator())
            {
                // Перезапускаем с правами администратора
                var exeName = System.Diagnostics.Process.GetCurrentProcess().MainModule?.FileName;
                if (!string.IsNullOrEmpty(exeName))
                {
                    try
                    {
                        var startInfo = new ProcessStartInfo
                        {
                            UseShellExecute = true,
                            WorkingDirectory = Environment.CurrentDirectory,
                            FileName = exeName,
                            Verb = "runas" // Запуск от имени администратора
                        };
                        Process.Start(startInfo);
                    }
                    catch
                    {
                        MessageBox.Show(
                            "Для установки агента требуются права администратора.\nПожалуйста, запустите программу от имени администратора.",
                            "Требуются права администратора",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Warning
                        );
                    }
                    return;
                }
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }

        private static bool IsRunAsAdministrator()
        {
            try
            {
                WindowsIdentity identity = WindowsIdentity.GetCurrent();
                WindowsPrincipal principal = new WindowsPrincipal(identity);
                return principal.IsInRole(WindowsBuiltInRole.Administrator);
            }
            catch
            {
                return false;
            }
        }
    }
}

