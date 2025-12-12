; Inno Setup скрипт для установки 1C Updater
; Включает автоматическую установку всех зависимостей

#define MyAppName "1C Updater"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "1C Updater"
#define MyAppURL "https://github.com/link28rus/1c-Updater"
#define MyAppExeName "1CUpdater.exe"

[Setup]
; Основные настройки
AppId={{A1B2C3D4-E5F6-4A5B-8C9D-0E1F2A3B4C5D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\1c-Updater
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=
OutputDir=.
OutputBaseFilename=1c-Updater-Setup
SetupIconFile=
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64

; Языки
[Languages]
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"

; Компоненты
[Components]
Name: "backend"; Description: "Backend сервер"; Types: full compact; Flags: fixed
Name: "frontend"; Description: "Frontend веб-интерфейс"; Types: full compact; Flags: fixed
Name: "agent"; Description: "Agent для удаленных ПК"; Types: full compact; Flags: fixed
Name: "scripts"; Description: "Вспомогательные скрипты"; Types: full compact; Flags: fixed

; Файлы для установки
[Files]
; Backend
Source: "dist\backend\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs createallsubdirs; Components: backend
; Frontend
Source: "dist\frontend\*"; DestDir: "{app}\frontend"; Flags: ignoreversion recursesubdirs createallsubdirs; Components: frontend
; Agent
Source: "dist\agent\*"; DestDir: "{app}\agent"; Flags: ignoreversion recursesubdirs createallsubdirs; Components: agent
; Scripts
Source: "dist\scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs; Components: scripts
Source: "dist\install-agent.ps1"; DestDir: "{app}"; Flags: ignoreversion; Components: scripts

; Ярлыки
[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

; Задачи
[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "installpostgresql"; Description: "Установить PostgreSQL (если не установлен)"; GroupDescription: "Зависимости"
Name: "setupdatabase"; Description: "Создать базу данных автоматически"; GroupDescription: "Настройка"
Name: "installbackendservice"; Description: "Установить Backend как Windows Service"; GroupDescription: "Службы"
Name: "installagentservice"; Description: "Установить Agent как Windows Service"; GroupDescription: "Службы"

; Prerequisites - автоматическая установка зависимостей
[Prerequisites]
; .NET 8 Runtime
Name: "dotnet8"; 
Description: ".NET 8 Runtime";
URL: "https://dotnet.microsoft.com/download/dotnet/thank-you/runtime-aspnetcore-8.0.0-windows-x64-installer";
Check: CheckDotNet8;
VersionMin: "8.0.0";
VersionMax: "8.9.9";

; Node.js LTS
Name: "nodejs";
Description: "Node.js LTS";
URL: "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi";
Check: CheckNodeJS;
VersionMin: "18.0.0";
VersionMax: "99.9.9";

[Code]
var
  PostgreSQLPage: TOutputProgressWizardPage;
  DatabasePage: TOutputProgressWizardPage;
  ServicesPage: TOutputProgressWizardPage;

// Проверка .NET 8 Runtime
function CheckDotNet8: Boolean;
var
  Version: String;
  MajorVersion: Integer;
  DotPos: Integer;
begin
  Result := RegQueryStringValue(HKLM, 'SOFTWARE\dotnet\Setup\InstalledVersions\x64\sharedhost', 'Version', Version);
  if Result then
  begin
    // Проверяем, что версия начинается с "8."
    DotPos := Pos('.', Version);
    if DotPos > 0 then
      MajorVersion := StrToIntDef(Copy(Version, 1, DotPos - 1), 0)
    else
      MajorVersion := StrToIntDef(Version, 0);
    Result := (MajorVersion = 8);
  end
  else
    Result := False;
end;

// Проверка Node.js
function CheckNodeJS: Boolean;
var
  Version: String;
  MajorVersion: Integer;
  DotPos: Integer;
begin
  Result := RegQueryStringValue(HKLM, 'SOFTWARE\Node.js', 'Version', Version);
  if Result then
  begin
    DotPos := Pos('.', Version);
    if DotPos > 0 then
      MajorVersion := StrToIntDef(Copy(Version, 1, DotPos - 1), 0)
    else
      MajorVersion := StrToIntDef(Version, 0);
    Result := MajorVersion >= 18;
  end
  else
    Result := False;
end;

// Проверка PostgreSQL
function CheckPostgreSQL: Boolean;
var
  Key: String;
  Versions: TArrayOfString;
  I: Integer;
  VersionNum: Integer;
begin
  Result := False;
  // Проверка через реестр
  if RegGetSubkeyNames(HKLM, 'SOFTWARE\PostgreSQL\Installations', Versions) then
  begin
    for I := 0 to GetArrayLength(Versions) - 1 do
    begin
      VersionNum := StrToIntDef(Versions[I], 0);
      if VersionNum >= 14 then
      begin
        Result := True;
        Break;
      end;
    end;
  end;
end;

// Инициализация
procedure InitializeWizard;
begin
  PostgreSQLPage := CreateOutputProgressPage('Установка PostgreSQL', 'Установка и настройка PostgreSQL...');
  DatabasePage := CreateOutputProgressPage('Настройка базы данных', 'Создание базы данных...');
  ServicesPage := CreateOutputProgressPage('Установка служб', 'Установка Windows Services...');
end;

// После установки файлов
procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
  ScriptPath: String;
begin
  if CurStep = ssPostInstall then
  begin
    // 1. Установка PostgreSQL (если выбрано)
    if IsTaskSelected('installpostgresql') and not CheckPostgreSQL then
    begin
      PostgreSQLPage.SetText('Установка PostgreSQL...', 'Это может занять несколько минут.');
      PostgreSQLPage.Show;
      try
        ScriptPath := ExpandConstant('{app}\scripts\install-postgresql.ps1');
        if FileExists(ScriptPath) then
        begin
          Exec('powershell.exe', '-ExecutionPolicy Bypass -NoProfile -File "' + ScriptPath + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
          if ResultCode <> 0 then
            MsgBox('Предупреждение: Не удалось установить PostgreSQL автоматически. Установите вручную.', mbInformation, MB_OK);
        end;
      finally
        PostgreSQLPage.Hide;
      end;
    end;

    // 2. Создание базы данных (если выбрано)
    if IsTaskSelected('setupdatabase') then
    begin
      DatabasePage.SetText('Создание базы данных...', 'Настройка PostgreSQL базы данных.');
      DatabasePage.Show;
      try
        ScriptPath := ExpandConstant('{app}\scripts\setup-database.ps1');
        if FileExists(ScriptPath) then
        begin
          Exec('powershell.exe', '-ExecutionPolicy Bypass -NoProfile -File "' + ScriptPath + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
        end;
      finally
        DatabasePage.Hide;
      end;
    end;

    // 3. Установка зависимостей backend
    DatabasePage.SetText('Установка зависимостей Backend...', 'Установка npm пакетов (это может занять несколько минут).');
    DatabasePage.Show;
    try
      ScriptPath := ExpandConstant('{app}\scripts\install-backend-dependencies.ps1');
      if FileExists(ScriptPath) then
      begin
        Exec('powershell.exe', '-ExecutionPolicy Bypass -NoProfile -File "' + ScriptPath + '" -InstallPath "' + ExpandConstant('{app}') + '"', '', SW_SHOW, ewWaitUntilTerminated, ResultCode);
        if ResultCode <> 0 then
          MsgBox('Предупреждение: Не удалось установить зависимости backend. Backend может не работать.', mbInformation, MB_OK);
      end;
    finally
      DatabasePage.Hide;
    end;

    // 4. Настройка backend (.env файл)
    DatabasePage.SetText('Настройка Backend...', 'Создание конфигурационного файла.');
    DatabasePage.Show;
    try
      ScriptPath := ExpandConstant('{app}\scripts\configure-backend.ps1');
      if FileExists(ScriptPath) then
      begin
        Exec('powershell.exe', '-ExecutionPolicy Bypass -NoProfile -File "' + ScriptPath + '" -InstallPath "' + ExpandConstant('{app}') + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      end;
    finally
      DatabasePage.Hide;
    end;

    // 5. Установка Backend как службы (если выбрано)
    if IsTaskSelected('installbackendservice') then
    begin
      ServicesPage.SetText('Установка Backend Service...', 'Регистрация Backend как Windows Service.');
      ServicesPage.Show;
      try
        ScriptPath := ExpandConstant('{app}\scripts\install-backend-service.ps1');
        if FileExists(ScriptPath) then
        begin
          Exec('powershell.exe', '-ExecutionPolicy Bypass -NoProfile -File "' + ScriptPath + '" -InstallPath "' + ExpandConstant('{app}') + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
        end;
      finally
        ServicesPage.Hide;
      end;
    end;

    // 6. Установка Agent как службы (если выбрано)
    if IsTaskSelected('installagentservice') then
    begin
      ServicesPage.SetText('Установка Agent Service...', 'Регистрация Agent как Windows Service.');
      ServicesPage.Show;
      try
        ScriptPath := ExpandConstant('{app}\install-agent.ps1');
        if FileExists(ScriptPath) then
        begin
          Exec('powershell.exe', '-ExecutionPolicy Bypass -NoProfile -File "' + ScriptPath + '" -InstallPath "' + ExpandConstant('{app}') + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
        end;
      finally
        ServicesPage.Hide;
      end;
    end;
  end;
end;

// При удалении
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ResultCode: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    // Остановка и удаление служб
    if MsgBox('Остановить и удалить Windows Services?', mbConfirmation, MB_YESNO) = IDYES then
    begin
      // Остановка Backend Service
      Exec('sc.exe', 'stop 1CUpdaterBackend', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec('sc.exe', 'delete 1CUpdaterBackend', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      
      // Остановка Agent Service
      Exec('sc.exe', 'stop 1CUpdaterAgent', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
      Exec('sc.exe', 'delete 1CUpdaterAgent', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end;
  end;
end;

