@echo off
chcp 65001 >nul
setlocal

REM 1. 백업 폴더 확인
set BACKUP_DIR=%appdata%\sopia-v3-update-backup
set TARGET_DIR=%appdata%\sopia-v3

if not exist "%BACKUP_DIR%" (
    echo 복원할 수 있는 데이터가 없습니다.
    pause
    exit /b
)

REM 2. 복원할 대상 파일/폴더 복사
echo 데이터를 복원하는 중입니다...

if exist "%BACKUP_DIR%\bundles" (
    xcopy "%BACKUP_DIR%\bundles" "%TARGET_DIR%\bundles" /E /I /Y
)

if exist "%BACKUP_DIR%\app.cfg" (
    copy /Y "%BACKUP_DIR%\app.cfg" "%TARGET_DIR%\app.cfg"
)

if exist "%BACKUP_DIR%\cmd.cfg" (
    copy /Y "%BACKUP_DIR%\cmd.cfg" "%TARGET_DIR%\cmd.cfg"
)

REM 3. 완료 메시지
echo 복원이 완료되었습니다. 소피아 프로그램을 다시 실행해 주세요.
pause
exit /b
