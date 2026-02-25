@echo off
echo.
echo   ========================================
echo     CurtainVision starting...
echo   ========================================
echo.

:: 启动后端
start "CurtainVision-Backend" cmd /k "cd /d D:\CurtainVision\backend && set PYTHONIOENCODING=utf-8 && venv\Scripts\activate && python main.py"

:: 等后端启动（加长等待时间）
timeout /t 8 /nobreak > nul

:: 启动前端
start "CurtainVision-Frontend" cmd /k "cd /d D:\CurtainVision\frontend && npm run dev"

:: 等前端启动
timeout /t 6 /nobreak > nul

:: 打开浏览器
start http://localhost:5173

echo.
echo   All services started!
echo   Close the two black windows to stop services.
echo.
pause