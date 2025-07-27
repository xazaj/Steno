<div align="center">

# Steno

**AI-Powered Desktop Transcription Application**

A modern, cross-platform desktop application for high-accuracy speech-to-text transcription, powered by OpenAI Whisper and built with Tauri + React.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/github/actions/workflow/status/your-username/steno/ci.yml?branch=main)](https://github.com/your-username/steno/actions)
[![Release Version](https://img.shields.io/github/v/release/your-username/steno)](https://github.com/your-username/steno/releases)
[![Downloads](https://img.shields.io/github/downloads/your-username/steno/total)](https://github.com/your-username/steno/releases)

[![Platform Support](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)](#installation)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?logo=react&logoColor=white)](https://reactjs.org/)
[![Rust](https://img.shields.io/badge/Rust-1.70+-000000.svg?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131.svg?logo=tauri&logoColor=white)](https://tauri.app/)

---

[**Download**](https://github.com/your-username/steno/releases) · [**Documentation**](https://github.com/your-username/steno/wiki) · [**Report Bug**](https://github.com/your-username/steno/issues) · [**Request Feature**](https://github.com/your-username/steno/issues)

</div>

## Overview

Steno is a sophisticated desktop application that transforms audio into accurate text using state-of-the-art AI technology. Built with performance and user experience in mind, it offers both real-time recording and file-based transcription capabilities with support for multiple languages and audio formats.

### Key Capabilities

- **Advanced Audio Processing** - Support for MP3, WAV, FLAC, OGG, AAC, M4A, WMA with intelligent format conversion
- **Real-time Transcription** - Live audio capture with simultaneous speech recognition
- **Multi-language Support** - Optimized for Chinese and English with automatic language detection
- **AI Model Flexibility** - Choose from Tiny (39MB), Base (74MB), or Large v3 (1.5GB) Whisper models
- **Cross-platform Performance** - Native application for macOS, Windows, and Linux
- **Apple Silicon Optimization** - Metal GPU acceleration on M1/M2/M3 Macs

## Installation

### System Requirements

| Platform | Version | Architecture | Memory | Storage |
|----------|---------|--------------|--------|---------|
| **macOS** | 11.0+ | Intel / Apple Silicon | 8GB+ | 3GB+ |
| **Windows** | 10+ | x64 | 8GB+ | 3GB+ |
| **Linux** | Ubuntu 18.04+ | x64 | 8GB+ | 3GB+ |

### Quick Install

#### macOS

```bash
# Download and install
curl -L -o Steno.dmg https://github.com/your-username/steno/releases/latest/download/Steno_aarch64.dmg
open Steno.dmg

# Configure permissions (required for unsigned apps)
xattr -rd com.apple.quarantine "/Applications/Steno.app"
codesign --force --deep --sign - "/Applications/Steno.app"
```

#### Windows

```powershell
# Download and install MSI package
Invoke-WebRequest -Uri "https://github.com/your-username/steno/releases/latest/download/Steno_x64.msi" -OutFile "Steno.msi"
Start-Process -FilePath "Steno.msi" -Wait
```

#### Linux

```bash
# Ubuntu/Debian
wget https://github.com/your-username/steno/releases/latest/download/steno_amd64.deb
sudo dpkg -i steno_amd64.deb

# Arch Linux
yay -S steno-bin
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

## Development

### Prerequisites

- [Rust](https://rustup.rs/) 1.70+
- [Node.js](https://nodejs.org/) 18+
- [Git](https://git-scm.com/)

### Local Development

```bash
# Clone repository
git clone https://github.com/your-username/steno.git
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
npm run build:mac-intel   # Intel Mac
npm run build:windows     # Windows x64
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

- **Bug Reports**: [GitHub Issues](https://github.com/your-username/steno/issues)
- **Feature Requests**: [GitHub Issues](https://github.com/your-username/steno/issues)
- **Documentation**: [Project Wiki](https://github.com/your-username/steno/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/steno/discussions)

---

<div align="center">

**[⬆ Back to Top](#steno)**

Made with care by the Steno development team

</div>