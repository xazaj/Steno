<div align="center">

# Steno

**AI-Powered Desktop Transcription Application**

A modern, cross-platform desktop application for high-accuracy speech-to-text transcription, powered by OpenAI Whisper and built with Tauri + React.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/github/actions/workflow/status/xazaj/Steno/ci.yml?branch=main)](https://github.com/xazaj/Steno/actions)
[![Release Version](https://img.shields.io/github/v/release/xazaj/Steno)](https://github.com/xazaj/Steno/releases)
[![Downloads](https://img.shields.io/github/downloads/xazaj/Steno/total)](https://github.com/xazaj/Steno/releases)

[![Platform Support](https://img.shields.io/badge/platform-macOS-lightgrey.svg)](#installation)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?logo=react&logoColor=white)](https://reactjs.org/)
[![Rust](https://img.shields.io/badge/Rust-1.70+-000000.svg?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131.svg?logo=tauri&logoColor=white)](https://tauri.app/)

---

[**Download**](https://github.com/xazaj/Steno/releases) · [**Documentation**](https://github.com/xazaj/Steno/wiki) · [**Report Bug**](https://github.com/xazaj/Steno/issues) · [**Request Feature**](https://github.com/xazaj/Steno/issues) · [**中文**](README_CN.md)

</div>

## Overview

Steno is a sophisticated desktop application that transforms audio into accurate text using state-of-the-art AI technology. Built with performance and user experience in mind, it offers both real-time recording and file-based transcription capabilities with support for multiple languages and audio formats.

### Key Capabilities

- **Advanced Audio Processing** - Support for MP3, WAV, FLAC, OGG, AAC, M4A, WMA with intelligent format conversion
- **Real-time Transcription** - Live audio capture with simultaneous speech recognition
- **Multi-language Support** - Optimized for Chinese, English, and Indonesian with automatic language detection
- **AI Model Flexibility** - Choose from Tiny (39MB), Base (74MB), or Large v3 (1.5GB) Whisper models
- **Native macOS Performance** - Optimized desktop application for macOS
- **Apple Silicon Optimization** - Metal GPU acceleration on M1/M2/M3 Macs

## Installation

### System Requirements

| Platform | Version | Architecture | Memory | Storage |
|----------|---------|--------------|--------|---------|
| **macOS** | 10.15+ | Apple Silicon (M1/M2/M3) | 4GB+ | 200MB+ |

### Quick Install

#### macOS

```bash
# Download and install
curl -L -o Steno.dmg https://github.com/xazaj/Steno/releases/download/v1.0.0/Steno_1.0.0_aarch64.dmg
open Steno.dmg

# Configure permissions (required for unsigned apps)
xattr -rd com.apple.quarantine "/Applications/Steno.app"
codesign --force --deep --sign - "/Applications/Steno.app"
```

### First Launch Setup

1. **Model Selection**: Choose your preferred Whisper model based on your needs:
   - **Tiny Model** (39MB) - Fast processing, basic accuracy
   - **Base Model** (74MB) - Balanced performance and quality
   - **Large v3 Model** (1.5GB) - Highest accuracy, slower processing

2. **Permissions**: Grant microphone access for real-time transcription features

## Usage

### Basic Workflow

```
Audio Input → Processing → AI Recognition → Text Output → Export
```

### Transcription Modes

| Mode | Use Case | Input | Features |
|------|----------|-------|----------|
| **File Mode** | Batch processing | Audio files | Drag & drop, batch queue, format conversion |
| **Real-time** | Live recording | Microphone | Live preview, speaker detection, instant results |
| **Long Audio** | Extended content | Large files | Smart chunking, progress tracking, memory optimization |

### Advanced Features

- **Smart Prompts** - Context-aware templates for meetings, interviews, medical, and technical content
- **Speaker Diarization** - Automatic identification and separation of different speakers
- **Export Options** - Multiple formats including TXT, SRT, JSON, and Markdown
- **Search & Organization** - Tag-based categorization with powerful filtering capabilities

## Data Storage

### Application Data Location

```
~/Library/Application Support/com.steno.app/
├── database/
│   └── steno.db                    # SQLite database (transcription records & settings)
├── models/                         # Whisper AI model files
│   ├── ggml-tiny.bin              # Tiny model (~39MB)
│   ├── ggml-base.bin              # Base model (~142MB)
│   └── ggml-large-v3.bin          # Large v3 model (~1.55GB)
├── audio/
│   ├── uploads/                    # User uploaded audio files
│   └── temp/                       # Temporary audio files
└── logs/                          # Application logs
    └── app.log
```

### Data Management

```bash
# View application data
open "~/Library/Application Support/com.steno.app/"

# Backup database
cp "~/Library/Application Support/com.steno.app/database/steno.db" ~/Desktop/steno_backup.db

# Clean temporary files
rm -rf "~/Library/Application Support/com.steno.app/audio/temp/"
```

## Development

### Prerequisites

- [Rust](https://rustup.rs/) 1.70+
- [Node.js](https://nodejs.org/) 18+
- [Git](https://git-scm.com/)

### Local Development

```bash
# Clone repository
git clone https://github.com/xazaj/Steno.git
cd steno

# Install dependencies
npm install

# Start development server
npm run tauri:dev
```

### Build Commands

```bash
# Development with hot reload
npm run tauri:dev

# Production build
npm run tauri:build

# Platform-specific builds
npm run build:mac-m1      # Apple Silicon
```

### Project Architecture

```
steno/
├── src/                  # React frontend
│   ├── components/       # UI components
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript definitions
│   └── utils/           # Utility functions
├── src-tauri/           # Rust backend
│   ├── src/             # Core application logic
│   ├── lib/             # whisper.cpp integration
│   └── capabilities/    # Tauri security permissions
├── docs/                # Documentation
└── models/              # AI model storage
```

### Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite |
| **Backend** | Rust, Tauri 2.0, whisper.cpp, SQLite |
| **Audio Processing** | Symphonia, CPAL, WebRTC VAD, RustFFT |
| **AI Models** | OpenAI Whisper (Tiny, Base, Large v3) |

## Contributing

We welcome contributions from the community. Please read our [Contributing Guidelines](CONTRIBUTING.md) before getting started.

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/new-feature`)
3. **Commit** your changes (`git commit -m 'Add new feature'`)
4. **Push** to the branch (`git push origin feature/new-feature`)
5. **Open** a Pull Request

### Code Standards

- Follow [Conventional Commits](https://conventionalcommits.org/) for commit messages
- Run tests before submitting: `npm test && cargo test`
- Ensure code formatting: `npm run lint && cargo fmt`
- Add documentation for new features

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [OpenAI Whisper](https://github.com/openai/whisper) - State-of-the-art speech recognition models
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) - High-performance C++ implementation
- [Tauri](https://tauri.app/) - Modern desktop application framework
- [Symphonia](https://github.com/pdeljanov/Symphonia) - Professional audio decoding library

## Support

- **Bug Reports**: [GitHub Issues](https://github.com/xazaj/Steno/issues)
- **Feature Requests**: [GitHub Issues](https://github.com/xazaj/Steno/issues)
- **Documentation**: [Project Wiki](https://github.com/xazaj/Steno/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/xazaj/Steno/discussions)

---

<div align="center">

**[⬆ Back to Top](#steno)**

Made with care by the Steno development team

</div>