#!/bin/bash

# Steno 应用安装脚本
# 自动处理 macOS Gatekeeper 限制

APP_NAME="Steno"
DMG_PATH="$1"

echo "🚀 开始安装 ${APP_NAME}..."

# 检查DMG文件是否存在
if [ ! -f "$DMG_PATH" ]; then
    echo "❌ 错误: DMG文件不存在: $DMG_PATH"
    echo "使用方法: ./install_steno.sh /path/to/Steno_1.0.0_aarch64.dmg"
    exit 1
fi

echo "📁 移除文件隔离属性..."
sudo xattr -rd com.apple.quarantine "$DMG_PATH" 2>/dev/null || true

echo "💿 挂载DMG文件..."
MOUNT_POINT=$(hdiutil attach "$DMG_PATH" | grep -E '^/dev/' | awk '{print $3}')

if [ -z "$MOUNT_POINT" ]; then
    echo "❌ 错误: 无法挂载DMG文件"
    exit 1
fi

echo "📱 复制应用到 Applications 文件夹..."
if [ -d "$MOUNT_POINT/${APP_NAME}.app" ]; then
    sudo cp -R "$MOUNT_POINT/${APP_NAME}.app" /Applications/
    echo "🔐 移除应用隔离属性..."
    sudo xattr -rd com.apple.quarantine "/Applications/${APP_NAME}.app" 2>/dev/null || true
    echo "✅ 应用安装成功！"
else
    echo "❌ 错误: 在DMG中找不到 ${APP_NAME}.app"
fi

echo "💿 卸载DMG文件..."
hdiutil detach "$MOUNT_POINT"

echo ""
echo "🎉 安装完成！"
echo "现在可以在 Applications 文件夹中找到 ${APP_NAME} 应用"
echo ""
echo "如果仍然无法打开，请尝试："
echo "1. 右键点击应用 → 打开"
echo "2. 或执行: open /Applications/${APP_NAME}.app"
echo ""
echo "⚠️  首次运行时，macOS可能仍会显示安全提示"
echo "   请选择'打开'以确认信任该应用"