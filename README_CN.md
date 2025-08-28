<div align="center">

# Steno

**AI驱动的桌面转录应用程序**

一个现代化的桌面应用程序，提供高精度的语音转文字转录服务，基于OpenAI Whisper技术构建，使用Tauri + React开发。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/github/actions/workflow/status/xazaj/Steno/ci.yml?branch=main)](https://github.com/xazaj/Steno/actions)
[![Release Version](https://img.shields.io/github/v/release/xazaj/Steno)](https://github.com/xazaj/Steno/releases)
[![Downloads](https://img.shields.io/github/downloads/xazaj/Steno/total)](https://github.com/xazaj/Steno/releases)

[![Platform Support](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](#installation)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?logo=react&logoColor=white)](https://reactjs.org/)
[![Rust](https://img.shields.io/badge/Rust-1.70+-000000.svg?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131.svg?logo=tauri&logoColor=white)](https://tauri.app/)

---

[**下载**](https://github.com/xazaj/Steno/releases) · [**文档**](https://github.com/xazaj/Steno/wiki) · [**报告问题**](https://github.com/xazaj/Steno/issues) · [**功能建议**](https://github.com/xazaj/Steno/issues) · [**English**](README.md)

</div>

## 概览

Steno是一个精巧的桌面应用程序，使用最先进的AI技术将音频转换为准确的文本。专注于性能和用户体验，提供实时录音和基于文件的转录功能，支持多种语言和音频格式。

### 核心功能

- **高级音频处理** - 支持MP3、WAV、FLAC、OGG、AAC、M4A、WMA格式，智能格式转换
- **实时转录** - 实时音频捕获与同步语音识别
- **多语言支持** - 优化支持中文、英文和印尼语，支持自动语言检测
- **AI模型灵活性** - 可选择Tiny (39MB)、Base (74MB)或Large v3 (1.5GB) Whisper模型
- **原生macOS性能** - 针对macOS优化的桌面应用程序
- **Apple Silicon优化** - M1/M2/M3 Mac上的Metal GPU加速

## 安装

### 系统要求

| 平台 | 版本 | 架构 | 内存 | 存储 |
|----------|---------|--------------|--------|---------|
| **macOS** | 10.15+ | Apple Silicon (M1/M2/M3) | 4GB+ | 200MB+ |

### 快速安装

#### macOS

```bash
# 下载并安装
curl -L -o Steno.dmg https://github.com/xazaj/Steno/releases/download/v1.0.0/Steno_1.0.0_aarch64.dmg
open Steno.dmg

# 配置权限（未签名应用必需）
xattr -rd com.apple.quarantine "/Applications/Steno.app"
codesign --force --deep --sign - "/Applications/Steno.app"
```

### 首次启动设置

1. **模型选择**：根据您的需求选择首选的Whisper模型：
   - **Tiny模型** (39MB) - 快速处理，基础精度
   - **Base模型** (74MB) - 平衡的性能和质量
   - **Large v3模型** (1.5GB) - 最高精度，较慢处理

2. **权限**：授予麦克风访问权限以使用实时转录功能

## 使用方法

### 基本工作流程

```
音频输入 → 处理 → AI识别 → 文本输出 → 导出
```

### 转录模式

| 模式 | 用例 | 输入 | 功能 |
|------|----------|-------|----------|
| **文件模式** | 批量处理 | 音频文件 | 拖拽上传、批量队列、格式转换 |
| **实时模式** | 实时录音 | 麦克风 | 实时预览、说话人检测、即时结果 |
| **长音频** | 扩展内容 | 大文件 | 智能分块、进度跟踪、内存优化 |

### 高级功能

- **智能提示词** - 针对会议、访谈、医疗和技术内容的上下文感知模板
- **说话人分离** - 自动识别和分离不同说话人
- **导出选项** - 支持TXT、SRT、JSON和Markdown等多种格式
- **搜索与整理** - 基于标签的分类和强大的筛选功能

## 数据存储

### 应用数据位置

```
~/Library/Application Support/com.steno.app/
├── database/
│   └── steno.db                    # SQLite数据库（转录记录和设置）
├── models/                         # Whisper AI模型文件
│   ├── ggml-tiny.bin              # Tiny模型 (~39MB)
│   ├── ggml-base.bin              # Base模型 (~142MB)
│   └── ggml-large-v3.bin          # Large v3模型 (~1.55GB)
├── audio/
│   ├── uploads/                    # 用户上传的音频文件
│   └── temp/                       # 临时音频文件
└── logs/                          # 应用日志
    └── app.log
```

### 数据管理

```bash
# 查看应用数据
open "~/Library/Application Support/com.steno.app/"

# 备份数据库
cp "~/Library/Application Support/com.steno.app/database/steno.db" ~/Desktop/steno_backup.db

# 清理临时文件
rm -rf "~/Library/Application Support/com.steno.app/audio/temp/"
```

## 开发

### 前置要求

- [Rust](https://rustup.rs/) 1.70+
- [Node.js](https://nodejs.org/) 18+
- [Git](https://git-scm.com/)

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/xazaj/Steno.git
cd steno

# 安装依赖
npm install

# 启动开发服务器
npm run tauri:dev
```

### 构建命令

```bash
# 开发模式（热重载）
npm run tauri:dev

# 生产构建
npm run tauri:build

# 平台特定构建
npm run build:mac-m1      # Apple Silicon
```

### 项目架构

```
steno/
├── src/                  # React前端
│   ├── components/       # UI组件
│   ├── hooks/           # 自定义React钩子
│   ├── types/           # TypeScript类型定义
│   └── utils/           # 工具函数
├── src-tauri/           # Rust后端
│   ├── src/             # 核心应用逻辑
│   ├── lib/             # whisper.cpp集成
│   └── capabilities/    # Tauri安全权限
├── docs/                # 文档
└── models/              # AI模型存储
```

### 技术栈

| 层级 | 技术 |
|-------|-------------|
| **前端** | React 18, TypeScript, Tailwind CSS, Vite |
| **后端** | Rust, Tauri 2.0, whisper.cpp, SQLite |
| **音频处理** | Symphonia, CPAL, WebRTC VAD, RustFFT |
| **AI模型** | OpenAI Whisper (Tiny, Base, Large v3) |

## 贡献

我们欢迎社区贡献。开始之前请阅读我们的[贡献指南](CONTRIBUTING.md)。

### 开发工作流程

1. **Fork**仓库
2. **创建**功能分支 (`git checkout -b feature/new-feature`)
3. **提交**更改 (`git commit -m '添加新功能'`)
4. **推送**到分支 (`git push origin feature/new-feature`)
5. **打开** Pull Request

### 代码标准

- 遵循[约定式提交](https://conventionalcommits.org/)规范
- 提交前运行测试：`npm test && cargo test`
- 确保代码格式：`npm run lint && cargo fmt`
- 为新功能添加文档

## 许可证

本项目基于MIT许可证 - 详细信息请参阅[LICENSE](LICENSE)文件。

## 致谢

- [OpenAI Whisper](https://github.com/openai/whisper) - 最先进的语音识别模型
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) - 高性能C++实现
- [Tauri](https://tauri.app/) - 现代桌面应用程序框架
- [Symphonia](https://github.com/pdeljanov/Symphonia) - 专业音频解码库

## 支持

- **问题报告**: [GitHub Issues](https://github.com/xazaj/Steno/issues)
- **功能建议**: [GitHub Issues](https://github.com/xazaj/Steno/issues)
- **文档**: [项目Wiki](https://github.com/xazaj/Steno/wiki)
- **讨论**: [GitHub Discussions](https://github.com/xazaj/Steno/discussions)

---

<div align="center">

**[⬆ 回到顶部](#steno)**

由Steno开发团队用心制作

</div>