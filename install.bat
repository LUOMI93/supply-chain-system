@echo off
chcp 65001 >nul
echo ======================================
echo  供应链产品管理系统 - 安装
echo ======================================
echo.
echo [1/3] 安装依赖...
call pnpm install
echo.
echo [2/3] 初始化数据库...
call npx prisma generate
call npx prisma db push
echo.
echo [3/3] 创建账号...
call npx tsx scripts/seed.ts
echo.
echo ======================================
echo  安装完成！
echo.
echo  启动方式：双击 start.bat
echo  浏览器打开 http://localhost:3000
echo.
echo  登录账号:
echo    admin   / admin123  (管理员)
echo    editor  / editor123 (编辑者)
echo    viewer  / viewer123 (查看者)
echo ======================================
pause
