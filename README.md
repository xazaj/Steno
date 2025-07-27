# 🎙️ Steno - AI语音识别应用

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)
![Tauri](https://img.shields.io/badge/Tauri-2.0-blue.svg)
![Rust](https://img.shields.io/badge/Rust-1.70+-red.svg)
![React](https://img.shields.io/badge/React-18+-blue.svg)

一款现代化的AI语音识别桌面应用，基于OpenAI Whisper技术，支持多种音频格式和语言识别。

## ✨ 功能特性

### 🎵 音频格式支持
- **多格式支持**: MP3, WAV, FLAC, OGG, AAC, M4A, WMA
- **智能转换**: 自动转换为Whisper所需的16kHz单声道格式
- **高质量处理**: 使用Symphonia音频库进行专业级解码

### 🌐 多语言识别
- **中文识别**: 专门优化的中文语音识别
- **英文识别**: 高精度英文语音转文字
- **自动检测**: 智能识别音频中的主要语言
- **混合语言**: 支持中英文混合内容识别

### 🧠 AI技术优化
- **Whisper Large v3**: 使用OpenAI最新的大型语音识别模型
- **Beam Search**: 采用beam search算法提升识别准确率
- **Metal GPU加速**: 在macOS上使用Apple Metal GPU加速推理
- **智能后处理**: 自动纠正常见识别错误和标点符号

## 📦 安装指南

### 系统要求
- **macOS**: 11.0+ (Apple Silicon M1/M2/M3 或 Intel)
- **Windows**: 10+ 
- **Linux**: Ubuntu 18.04+ / 其他主流发行版
- **内存**: 8GB+ RAM (推荐16GB+)
- **存储**: 3GB+ 可用空间（用于AI模型）

### 🍎 macOS 安装（推荐）

#### 下载安装包
- **Apple Silicon (M1/M2/M3)**: `Steno_1.0.0_aarch64.dmg` (8.3MB)
- **Intel 芯片**: `Steno_1.0.0_x64.dmg`

#### 安装步骤
1. **下载并打开DMG文件**
   ```bash
   # 下载完成后双击打开DMG文件
   # 将Steno拖拽到应用程序文件夹
   ```

2. **配置应用权限（重要）**
   
   由于应用未经Apple公证，需要执行以下步骤：
   
   ```bash
   # 移除隔离属性
   xattr -rd com.apple.quarantine "/Applications/Steno.app"
   
   # 添加执行权限
   chmod +x "/Applications/Steno.app/Contents/MacOS/steno"  
   
   # 添加临时签名
   codesign --force --deep --sign - "/Applications/Steno.app"
   ```

3. **系统安全设置**
   
   如果仍无法打开，需要修改系统安全设置：
   
   - **macOS Ventura (13.0+)**:
     1. 系统设置 → 隐私与安全性
     2. 安全性 → 允许从以下位置下载的应用程序
     3. 选择 **"任何来源"**
   
   - **macOS Monterey (12.0+)**:
     1. 系统偏好设置 → 安全性与隐私
     2. 通用 → 允许从以下位置下载的应用程序
     3. 选择 **"任何来源"**
   
   - **启用"任何来源"选项**（如果未显示）:
     ```bash
     sudo spctl --master-disable
     ```

4. **首次启动**
   ```bash
   # 通过Finder打开应用程序文件夹，双击Steno
   # 或通过终端启动
   open "/Applications/Steno.app"
   ```

5. **下载AI模型**
   
   首次启动时应用会自动提示下载AI模型：
   - **Base模型**: 74MB，平衡性能
   - **Large v3模型**: 1.5GB，最佳质量（推荐）

#### 故障排除

如果应用仍然无法启动：

```bash
# 检查应用签名状态
codesign -dv "/Applications/Steno.app"

# 检查隔离属性
xattr -l "/Applications/Steno.app"

# 强制重新签名
sudo codesign --force --deep --sign - "/Applications/Steno.app"

# 查看崩溃日志
log show --predicate 'eventMessage contains "Steno"' --info --last 1h
```

### 💻 开发环境搭建

适用于需要从源码构建或参与开发的用户。

1. **安装Rust工具链**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   ```

2. **安装Node.js**
   ```bash
   # macOS (使用Homebrew)
   brew install node
   
   # 或从官网下载: https://nodejs.org/
   ```

3. **克隆项目**
   ```bash
   git clone https://github.com/your-username/steno.git
   cd steno
   ```

4. **安装依赖**
   ```bash
   # 安装前端依赖
   npm install
   ```

5. **运行应用**
   ```bash
   # 开发模式（热重载）
   npm run tauri:dev
   
   # 构建生产版本
   npm run tauri:build
   
   # 构建Mac M1专用版本
   npm run build:mac-m1
   
   # 构建Mac Intel版本
   npm run build:mac-intel
   ```

### 📱 构建配置

项目支持多平台构建：

```bash
# Mac 通用版本（M1 + Intel）
npm run build:mac

# Mac M1/M2/M3 专用版本
npm run build:mac-m1

# Mac Intel 专用版本  
npm run build:mac-intel

# Windows 版本
npm run build:windows

# 所有平台
npm run build:release
```

构建产物位置：
- **macOS**: `src-tauri/target/[target]/release/bundle/dmg/`
- **Windows**: `src-tauri/target/[target]/release/bundle/msi/`

## 🤝 贡献指南

### 参与贡献

1. Fork本项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

### 代码规范
- Rust代码遵循 `rustfmt` 格式
- TypeScript代码遵循 ESLint 规则
- 提交信息使用英文，遵循约定式提交格式

### 问题报告
使用GitHub Issues报告bug或请求新功能，请包含：
- 操作系统和版本
- 应用版本
- 复现步骤
- 错误信息或截图

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- [OpenAI Whisper](https://github.com/openai/whisper) - 强大的语音识别模型
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) - 高效的C++实现
- [Tauri](https://tauri.app/) - 现代化桌面应用框架
- [Symphonia](https://github.com/pdeljanov/Symphonia) - 专业音频解码库

## 📞 联系方式

- **项目主页**: https://github.com/xazaj/steno
- **问题反馈**: https://github.com/xazaj/steno/issues
- **讨论交流**: https://github.com/xazaj/steno/discussions

---

## ⚠️ 重要说明

### 关于未签名应用
- 本应用未经Apple开发者证书签名，macOS会显示安全警告
- 这是正常现象，应用本身是安全的
- 请按照上述安装步骤正确配置权限

### 首次使用
- 首次启动需要网络连接下载AI模型（39MB-1.5GB）
- 推荐在Apple Silicon Mac上使用以获得最佳性能
- 模型下载完成后即可离线使用

### 性能优化
- **Apple Silicon (M1/M2/M3)**: 使用Metal GPU加速，性能最佳
- **Intel Mac**: 使用CPU处理，建议选择较小的模型
- **内存建议**: 8GB以上，使用Large模型需要16GB+
