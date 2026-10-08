@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo   KHOI DONG UNG DUNG CHAM CONG & QUAN LY CHI PHI (LOCAL)
echo ============================================================

where py >nul 2>&1
if %errorlevel% equ 0 (
    py start.py
    goto finish
)

where python >nul 2>&1
if %errorlevel% equ 0 (
    python start.py
    goto finish
)

echo [CANH BAO] Khong tim thay Python! Dang thu khoi dong truc tiep qua npm...
call npm run dev
pause

:finish
