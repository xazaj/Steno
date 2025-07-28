# Windows 安装目录配置方案

## 概述

为了实现Windows下的便携式部署，Steno在Windows平台使用**安装目录存储模式**，将所有数据文件存储在应用程序安装目录下，而不是用户的AppData目录。

## 目录结构

```
Steno安装目录/
├── steno.exe                 # 主程序可执行文件
├── data/                     # 数据目录
│   ├── steno.db             # SQLite数据库（转录记录）
│   └── backups/             # 数据库自动备份
│       ├── steno_backup_20250128_143022_upgrade.db
│       └── steno_backup_20250128_143500_auto.db
├── models/                   # AI模型目录
│   ├── model_config.json    # 模型配置文件
│   ├── ggml-tiny.bin       # Whisper模型文件（39MB）
│   ├── ggml-base.bin       # Whisper模型文件（74MB）
│   └── ggml-large-v3.bin   # Whisper模型文件（1.5GB）
└── logs/                     # 应用日志
    ├── steno_20250128.log   # 按日期分隔的日志文件
    └── steno_20250127.log
```

## 平台对比

| 组件 | Windows（安装目录模式） | macOS/Linux（传统模式） |
|------|-------------------------|-------------------------|
| 数据库 | `./data/steno.db` | `~/Library/Application Support/com.steno.app/` |
| 模型文件 | `./models/` | `~/Library/Application Support/Steno/models/` |
| 日志文件 | `./logs/` | `~/Library/Application Support/com.steno.app/logs/` |
| 配置文件 | `./models/model_config.json` | `~/Library/Application Support/Steno/models/model_config.json` |

## 技术实现

### 1. 路径获取策略

```rust
// Windows: 使用安装目录
#[cfg(target_os = "windows")]
fn get_windows_install_dir() -> Result<PathBuf> {
    // 方法1: 从可执行文件路径获取
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            return Ok(exe_dir.to_path_buf());
        }
    }
    
    // 方法2: 使用工作目录作为备选
    if let Ok(current_dir) = std::env::current_dir() {
        return Ok(current_dir);
    }
    
    // 方法3: 最后备选
    Ok(PathBuf::from("."))
}
```

### 2. 条件编译配置

所有路径相关的代码都使用条件编译：

```rust
#[cfg(target_os = "windows")]
{
    // Windows专用逻辑：使用安装目录
    let data_dir = install_dir.join("data");
}

#[cfg(not(target_os = "windows"))]
{
    // macOS/Linux：使用AppData目录
    let data_dir = app_handle.path().app_data_dir()?;
}
```

## 优势

### 1. 便携性
- **零依赖用户目录**：所有数据存储在应用目录下
- **完整备份**：复制整个安装目录即可备份所有数据
- **简化部署**：无需考虑用户权限和AppData目录结构

### 2. 企业友好
- **集中管理**：管理员可以统一管理应用和数据
- **权限控制**：避免AppData目录的复杂权限问题
- **合规性**：数据位置明确，符合企业数据管理要求

### 3. 用户体验
- **直观性**：用户能直接看到和管理数据文件
- **可控性**：用户可以自主选择安装位置
- **透明性**：数据存储位置清晰可见

## 兼容性考虑

### 1. 现有数据迁移
对于从AppData模式升级的用户，需要考虑数据迁移：

```rust
// 未来版本可能需要的迁移逻辑
fn migrate_from_appdata() -> Result<()> {
    let old_path = app_data_dir().join("steno.db");
    let new_path = install_dir().join("data").join("steno.db");
    
    if old_path.exists() && !new_path.exists() {
        std::fs::copy(old_path, new_path)?;
        // 同时迁移模型文件等...
    }
    Ok(())
}
```

### 2. 权限问题处理
- **安装目录写权限**：确保应用对安装目录有写权限
- **防病毒软件**：可能需要将安装目录加入白名单
- **UAC考虑**：程序目录下的写操作可能触发UAC

## 配置更新清单

### 已更新的文件：
- ✅ `database_manager.rs` - 数据库路径配置
- ✅ `model_management.rs` - 模型文件路径配置  
- ✅ `logging.rs` - 日志文件路径配置
- ✅ `tauri.conf.json` - Bundle ID更新为平台中性
- ✅ `path_test.rs` - 路径配置测试模块

### Bundle ID更新：
- **原值**：`com.steno.macos`（平台特定）
- **新值**：`com.steno.app`（平台中性）

## 测试验证

使用内置测试验证配置：

```bash
cargo test path_test::tests
```

## 注意事项

1. **开发环境**：开发环境下仍使用相对路径`./`作为基础目录
2. **生产环境**：生产环境下使用`current_exe()`获取真实安装路径
3. **向后兼容**：macOS和Linux平台保持原有AppData配置不变
4. **错误处理**：路径获取失败时有完善的回退机制

这个配置确保了Windows用户获得便携式应用体验，同时保持了与其他平台的兼容性。