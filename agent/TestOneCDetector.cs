using System;
using Microsoft.Extensions.Logging;

namespace OneCUpdaterAgent
{
    /// <summary>
    /// Простой тестовый класс для проверки GetLatest1CVersion()
    /// Запуск: dotnet run --project agent/1CUpdaterAgent.csproj -- TestOneC
    /// </summary>
    public class TestOneCDetector
    {
        public static void RunTest()
        {
            Console.WriteLine("=== Тест GetLatest1CVersion() ===\n");

            // Создаем простой logger для консоли
            using var loggerFactory = LoggerFactory.Create(builder =>
            {
                builder.AddConsole();
                builder.SetMinimumLevel(LogLevel.Information);
            });
            var logger = loggerFactory.CreateLogger<OneCDetector>();

            try
            {
                Console.WriteLine("Вызов OneCDetector.GetLatest1CVersion(logger)...\n");
                var version = OneCDetector.GetLatest1CVersion(logger);

                Console.WriteLine("\n=== Результат ===");
                if (version != null)
                {
                    Console.WriteLine($"✅ Найдена версия 1С: {version}");
                }
                else
                {
                    Console.WriteLine("❌ 1С не найдена в реестре");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n❌ Ошибка: {ex.Message}");
                Console.WriteLine($"Stack Trace: {ex.StackTrace}");
            }
        }
    }
}

