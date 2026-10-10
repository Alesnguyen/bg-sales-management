@echo off
REM Build bản cài Windows ngay trên máy này (cần Node.js LTS: https://nodejs.org/). Kết quả nằm trong thư mục dist\
cd /d "%~dp0.."
call npm install
if errorlevel 1 exit /b 1
call npm run dist
echo Xong. Xem thư mục dist\
pause
