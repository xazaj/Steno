# GitHub Release 发布信息模板

## Tag version
```
v1.0.0
```

## Release title
```
Steno v1.0.0 - AI语音识别桌面应用首个正式版
```

## Release description
```markdown
# 🎉 Steno v1.0.0 正式发布

基于OpenAI Whisper的现代化AI语音识别桌面应用，支持多种音频格式和语言识别。

## ✨ 主要特性

- 🎙️ **多格式音频转录**：支持MP3、WAV、M4A等主流音频格式
- 🌍 **多语言识别**：支持中文、英文、印尼语及自动检测
- 🤖 **智能提示词**：内置银行业务等专业场景提示词，提升识别准确度
- 📱 **现代化界面**：仿微信风格的直观用户界面
- ⚡ **本地处理**：完全离线运行，保护数据隐私
- 💾 **历史管理**：完整的转录历史记录和管理功能
- 🔍 **智能搜索**：快速查找历史转录记录

## 🚀 新功能

- ✅ 全新的音频转录引擎
- ✅ 智能提示词系统
- ✅ 多语言支持（中文/英文/印尼语）
- ✅ 转录历史管理
- ✅ 星标收藏功能
- ✅ 文件拖拽上传
- ✅ 实时转录（开发中）

## 💻 系统要求

### macOS
- **系统版本**: macOS 10.15 (Catalina) 或更高版本
- **处理器**: Apple Silicon (M1/M2/M3)
- **内存**: 至少 4GB RAM，推荐 8GB+
- **存储**: 至少 200MB 可用空间

## 📦 安装说明

### macOS 安装
由于应用使用自签名证书，首次安装需要额外步骤：

#### 🚀 方法1：一键安装（推荐）
下载安装脚本并运行：
```bash
curl -sSL https://github.com/xazaj/Steno/releases/download/v1.0.0/install.sh | bash -s -- ~/Downloads/Steno_1.0.0_aarch64.dmg
```

#### 🔧 方法2：手动安装
1. 下载 `Steno_1.0.0_aarch64.dmg`
2. **右键点击DMG文件** → 选择"打开"（不要双击）
3. 在弹出的安全警告中点击"打开"
4. 将应用拖拽到 Applications 文件夹
5. 在 Applications 中**右键点击 Steno.app** → 选择"打开"
6. 在安全提示中点击"打开"

#### ⚠️ 如果仍然无法打开
```bash
# 移除隔离属性
sudo xattr -rd com.apple.quarantine /Applications/Steno.app
```

详细安装说明请参考：[macOS安装指南](https://github.com/xazaj/Steno/blob/main/INSTALL_MACOS.md)

## 🔧 技术架构

- **前端**: React 18 + TypeScript + Tailwind CSS
- **后端**: Rust + Tauri 2.0
- **AI引擎**: OpenAI Whisper (whisper.cpp)
- **数据库**: SQLite
- **音频处理**: Metal Performance Shaders (GPU加速)

## 🗂️ 数据存储位置

应用数据存储在：
```
~/Library/Application Support/com.steno.app/
├── database/steno.db          # 转录记录和设置
├── models/                    # AI模型文件
├── audio/uploads/             # 用户音频文件
└── logs/                      # 应用日志
```

## 🐛 已知问题

- 实时录音功能暂时禁用（Coming Soon）
- 首次启动可能需要较长时间初始化Whisper模型
- macOS安全策略可能显示"无法验证开发者"警告（正常现象）

## 📈 下个版本计划 (v1.1.0)

- [ ] 实时语音转录功能
- [ ] 更多语言支持
- [ ] 云端同步功能
- [ ] 批量转录功能

## 🙏 致谢

感谢所有测试用户的反馈和建议！

## 📞 支持与反馈

- 🐛 问题报告: [GitHub Issues](https://github.com/xazaj/Steno/issues)
- 💬 功能建议: [Discussions](https://github.com/xazaj/Steno/discussions)
- 📚 使用文档: [项目Wiki](https://github.com/xazaj/Steno/wiki)

---

**首次使用？** 请查看 [用户手册](https://github.com/xazaj/Steno/blob/main/README.md) 获取详细使用说明。

**开发者？** 查看 [开发指南](https://github.com/xazaj/Steno/blob/main/CONTRIBUTING.md) 了解如何参与贡献。
```

## 需要上传的文件

1. **Steno_1.0.0_aarch64.dmg** - 主安装包
2. **install.sh** - 自动安装脚本  
3. **INSTALL_MACOS.md** - 详细安装说明

## Git标签建议

### 本地创建标签：
```bash
git tag -a v1.0.0 -m "Steno v1.0.0 - AI语音识别桌面应用首个正式版"
git push origin v1.0.0
```

### 或在GitHub网页创建Release时自动创建标签：
- Target: main (或你的默认分支)
- Tag: v1.0.0
- Release title: Steno v1.0.0 - AI语音识别桌面应用首个正式版

## 版本发布流程
1. 确保代码已合并到主分支
2. 在GitHub仓库页面点击"Releases"
3. 点击"Create a new release"
4. 填入上述信息
5. 上传DMG、安装脚本和说明文档
6. 勾选"Set as the latest release"
7. 点击"Publish release"