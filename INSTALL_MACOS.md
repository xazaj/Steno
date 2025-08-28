# Steno macOS 安装说明

## 重要提示
本应用使用自签名证书，未经Apple公证。这是安全的，但需要额外步骤来安装。

## 快速安装（推荐）

### 方法1：一键安装脚本
```bash
# 下载DMG后，在终端中运行：
curl -sSL https://github.com/xazaj/Steno/releases/download/v1.0.0/install.sh | bash -s -- ~/Downloads/Steno_1.0.0_aarch64.dmg
```

### 方法2：手动安装
1. **下载DMG文件**
2. **右键点击DMG文件** → 选择"打开"（不要双击）
3. **在弹出的安全警告中点击"打开"**
4. **将Steno.app拖拽到Applications文件夹**
5. **打开Applications文件夹，右键点击Steno.app** → 选择"打开"
6. **在安全提示中点击"打开"**

## 如果仍然无法打开

### 方法A：移除隔离属性
```bash
sudo xattr -rd com.apple.quarantine /Applications/Steno.app
```

### 方法B：临时禁用Gatekeeper
```bash
# 临时禁用（不推荐长期使用）
sudo spctl --master-disable

# 安装完成后记得重新启用
sudo spctl --master-enable
```

### 方法C：系统设置
1. 打开 **系统偏好设置** → **安全性与隐私** → **通用**
2. 如果看到关于Steno的提示，点击"仍要打开"
3. 或者选择允许"任何来源"的应用

## 故障排除

### 错误："应用程序已损坏"
```bash
sudo xattr -cr /Applications/Steno.app
sudo codesign --force --deep --sign - /Applications/Steno.app
```

### 错误："无法验证开发者"
这是正常现象，按照上述方法2的步骤操作即可。

### 权限问题
```bash
# 修复权限
sudo chmod -R 755 /Applications/Steno.app
sudo chown -R $(whoami):staff /Applications/Steno.app
```

## 为什么会出现这些警告？

1. **Apple的安全机制**：macOS默认只信任App Store或已公证的应用
2. **Gatekeeper保护**：防止恶意软件运行
3. **隔离属性**：从互联网下载的文件会被标记

这些都是正常的安全措施，Steno应用本身是安全的。

## 系统要求
- macOS 10.15 (Catalina) 或更高版本
- Apple Silicon (M1/M2/M3) 处理器
- 至少 200MB 可用空间

## 联系支持
如果仍有问题，请通过以下方式联系：
- GitHub Issues: https://github.com/xazaj/Steno/issues