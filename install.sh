#!/bin/bash

# Steno macOS 自动安装脚本
# 遵循Tauri最佳实践处理自签名应用

set -e

APP_NAME="Steno"
DMG_PATH="${1:-$(ls -t ~/Downloads/Steno_*.dmg 2>/dev/null | head -1)}"
INSTALL_DIR="/Applications"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查系统
check_system() {
    if [[ "$(uname)" != "Darwin" ]]; then
        print_error "此脚本只能在macOS上运行"
        exit 1
    fi
    
    local macos_version=$(sw_vers -productVersion)
    local major_version=$(echo $macos_version | cut -d. -f1)
    local minor_version=$(echo $macos_version | cut -d. -f2)
    
    if [[ $major_version -lt 10 ]] || [[ $major_version -eq 10 && $minor_version -lt 15 ]]; then
        print_error "需要macOS 10.15或更高版本，当前版本: $macos_version"
        exit 1
    fi
    
    print_success "系统检查通过: macOS $macos_version"
}

# 查找DMG文件
find_dmg() {
    if [[ -z "$DMG_PATH" ]]; then
        print_error "未找到DMG文件"
        echo "请提供DMG文件路径:"
        echo "  $0 /path/to/Steno_1.0.0_aarch64.dmg"
        exit 1
    fi
    
    if [[ ! -f "$DMG_PATH" ]]; then
        print_error "DMG文件不存在: $DMG_PATH"
        exit 1
    fi
    
    print_success "找到DMG文件: $DMG_PATH"
}

# 移除隔离属性
remove_quarantine() {
    print_status "移除文件隔离属性..."
    
    # 检查是否有隔离属性
    if xattr -l "$DMG_PATH" 2>/dev/null | grep -q "com.apple.quarantine"; then
        if xattr -d com.apple.quarantine "$DMG_PATH" 2>/dev/null; then
            print_success "已移除DMG隔离属性"
        else
            print_warning "需要管理员权限移除隔离属性"
            if sudo xattr -rd com.apple.quarantine "$DMG_PATH" 2>/dev/null; then
                print_success "已移除DMG隔离属性"
            fi
        fi
    else
        print_success "DMG文件无隔离属性"
    fi
}

# 挂载DMG
mount_dmg() {
    print_status "挂载DMG文件..."
    
    # 静默挂载DMG
    MOUNT_OUTPUT=$(hdiutil attach "$DMG_PATH" -nobrowse -quiet)
    MOUNT_POINT=$(echo "$MOUNT_OUTPUT" | grep -E '^/dev/' | awk '{print $3}' | head -1)
    
    if [[ -z "$MOUNT_POINT" ]]; then
        print_error "无法挂载DMG文件"
        exit 1
    fi
    
    print_success "DMG已挂载到: $MOUNT_POINT"
}

# 安装应用
install_app() {
    local app_source="$MOUNT_POINT/${APP_NAME}.app"
    local app_target="$INSTALL_DIR/${APP_NAME}.app"
    
    if [[ ! -d "$app_source" ]]; then
        print_error "在DMG中找不到 ${APP_NAME}.app"
        return 1
    fi
    
    print_status "安装应用到 $INSTALL_DIR..."
    
    # 如果已存在，先删除
    if [[ -d "$app_target" ]]; then
        print_warning "发现现有安装，正在替换..."
        rm -rf "$app_target"
    fi
    
    # 复制应用
    if cp -R "$app_source" "$INSTALL_DIR/"; then
        print_success "应用复制完成"
    else
        print_error "复制应用失败，尝试使用sudo..."
        if sudo cp -R "$app_source" "$INSTALL_DIR/"; then
            print_success "应用复制完成（使用管理员权限）"
        else
            print_error "应用复制失败"
            return 1
        fi
    fi
    
    # 修复权限
    chmod -R 755 "$app_target" 2>/dev/null || sudo chmod -R 755 "$app_target"
    
    # 移除应用的隔离属性
    if xattr -rd com.apple.quarantine "$app_target" 2>/dev/null; then
        print_success "已移除应用隔离属性"
    elif sudo xattr -rd com.apple.quarantine "$app_target" 2>/dev/null; then
        print_success "已移除应用隔离属性（使用管理员权限）"
    fi
}

# 卸载DMG
unmount_dmg() {
    if [[ -n "$MOUNT_POINT" ]]; then
        print_status "卸载DMG..."
        if hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null; then
            print_success "DMG已卸载"
        else
            print_warning "DMG卸载失败，但不影响安装"
        fi
    fi
}

# 验证安装
verify_installation() {
    local app_path="$INSTALL_DIR/${APP_NAME}.app"
    
    if [[ -d "$app_path" ]]; then
        print_success "安装验证通过"
        
        # 检查代码签名
        local signing_info=$(codesign -dvv "$app_path" 2>&1 || echo "unsigned")
        if echo "$signing_info" | grep -q "adhoc"; then
            print_status "应用使用adhoc签名（自签名）"
        elif echo "$signing_info" | grep -q "unsigned"; then
            print_warning "应用未签名"
        fi
        
        return 0
    else
        print_error "安装验证失败"
        return 1
    fi
}

# 提供使用说明
show_instructions() {
    echo
    echo -e "${GREEN}🎉 安装完成！${NC}"
    echo
    echo "应用位置: $INSTALL_DIR/${APP_NAME}.app"
    echo
    echo -e "${YELLOW}首次启动说明:${NC}"
    echo "1. 在Launchpad或Applications文件夹中找到Steno"
    echo "2. 右键点击应用，选择'打开'（不要双击）"
    echo "3. 在安全提示中点击'打开'"
    echo
    echo -e "${YELLOW}或者使用命令行启动:${NC}"
    echo "  open /Applications/${APP_NAME}.app"
    echo
    echo -e "${BLUE}注意: 这是正常的macOS安全提醒，应用本身是安全的${NC}"
}

# 清理函数
cleanup() {
    unmount_dmg
}

# 设置清理陷阱
trap cleanup EXIT

# 主执行流程
main() {
    echo -e "${BLUE}Steno macOS 安装程序${NC}"
    echo "================================"
    
    check_system
    find_dmg
    remove_quarantine
    mount_dmg
    
    if install_app && verify_installation; then
        show_instructions
    else
        print_error "安装失败"
        exit 1
    fi
}

# 执行主程序
main "$@"