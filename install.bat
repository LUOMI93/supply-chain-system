@echo off
chcp 65001 >nul
echo ======================================
echo  Supply Chain System - 本地开发安装
echo ======================================
echo.
echo [1/3] 安装依赖...
call pnpm install
echo.
echo [2/3] 初始化开发数据库...
call pnpm db:setup:dev
echo.
echo [3/3] 本地开发演示账号已创建
echo.
echo ======================================
echo  安装完成
echo.
echo  启动方式：双击 start.bat
echo  浏览器打开 http://localhost:3000
echo.
echo  以下账号仅用于本地开发，禁止用于生产：
echo    admin   / admin123  管理员
echo    editor  / editor123 编辑者
echo    viewer  / viewer123 查看者
echo.
echo  生产部署请阅读 docs\DEPLOYMENT.md
echo ======================================
pause
