@echo off
echo.
echo   ========================================
echo     CurtainVision starting...
echo   ========================================
echo.

:: 启动后端（使用主仓库 venv，运行 worktree 的代码）
start "CurtainVision-Backend" cmd /k "cd /d D:\CurtainVision\.claude\worktrees\keen-pare\backend && set PYTHONIOENCODING=utf-8 && D:\CurtainVision\backend\venv\Scripts\activate && pip install Pillow -q && python main.py"

:: 等后端启动（加长等待时间）
timeout /t 8 /nobreak > nul

:: 启动前端（缺 node_modules 时自动安装）
start "CurtainVision-Frontend" cmd /k "cd /d D:\CurtainVision\.claude\worktrees\keen-pare\frontend && if not exist node_modules npm install && npm run dev"

:: 等前端启动
timeout /t 6 /nobreak > nul

:: 打开浏览器
start http://localhost:5173

echo.
echo   All services started!
echo   Close the two black windows to stop services.
echo.
pause