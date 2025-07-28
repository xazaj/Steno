use rusqlite::{Connection, Result};
use tauri::Manager;
use std::path::PathBuf;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;

/// 数据库版本和迁移管理器
pub struct DatabaseManager {
    pub(crate) db_path: PathBuf,
    pub(crate) backup_dir: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseInfo {
    pub version: i32,
    pub created_at: String,
    pub last_backup: Option<String>,
    pub backup_count: i32,
}

impl DatabaseManager {
    /// 当前数据库版本
    const CURRENT_VERSION: i32 = 1;
    /// 最大备份文件数量
    const MAX_BACKUPS: usize = 10;

    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self> {
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CANTOPEN),
                Some(format!("Failed to get app data dir: {}", e))
            ))?;

        // 创建应用数据目录
        std::fs::create_dir_all(&app_data_dir)
            .map_err(|e| rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CANTOPEN),
                Some(format!("Failed to create app data dir: {}", e))
            ))?;

        let db_path = app_data_dir.join("steno.db");
        let backup_dir = app_data_dir.join("backups");
        
        // 创建备份目录
        std::fs::create_dir_all(&backup_dir)
            .map_err(|e| rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CANTOPEN),
                Some(format!("Failed to create backup dir: {}", e))
            ))?;

        Ok(Self {
            db_path,
            backup_dir,
        })
    }

    /// 初始化或升级数据库
    pub fn initialize_database(&self) -> Result<Connection> {
        let is_new_db = !self.db_path.exists();
        let conn = Connection::open(&self.db_path)?;
        
        if is_new_db {
            // 全新安装 - 创建所有表和初始化数据
            self.create_initial_schema(&conn)?;
            self.set_database_version(&conn, Self::CURRENT_VERSION)?;
            println!("✓ 创建新数据库，版本 {}", Self::CURRENT_VERSION);
        } else {
            // 现有数据库 - 检查版本并进行迁移
            let current_version = self.get_database_version(&conn)?;
            if current_version < Self::CURRENT_VERSION {
                // 升级前先备份
                self.create_backup("before_upgrade")?;
                self.migrate_database(&conn, current_version, Self::CURRENT_VERSION)?;
                println!("✓ 数据库从版本 {} 升级到版本 {}", current_version, Self::CURRENT_VERSION);
            } else if current_version == Self::CURRENT_VERSION {
                println!("✓ 数据库已是最新版本 {}", current_version);
            } else {
                return Err(rusqlite::Error::SqliteFailure(
                    rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISMATCH),
                    Some(format!("数据库版本 {} 高于应用支持的版本 {}", current_version, Self::CURRENT_VERSION))
                ));
            }
        }

        // 清理旧备份文件
        self.cleanup_old_backups();

        Ok(conn)
    }

    /// 创建初始数据库结构
    fn create_initial_schema(&self, conn: &Connection) -> Result<()> {
        // 创建元数据表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS database_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        // 创建转录记录表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS transcription_records (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                original_file_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                duration REAL,
                status TEXT NOT NULL,
                progress REAL DEFAULT 0,
                error_message TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                tags TEXT NOT NULL,
                category TEXT,
                is_starred BOOLEAN DEFAULT 0,
                config TEXT NOT NULL,
                processing_time REAL,
                accuracy REAL
            )",
            [],
        )?;

        // 创建转录内容表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS transcription_contents (
                record_id TEXT PRIMARY KEY,
                full_text TEXT NOT NULL,
                segments TEXT,
                FOREIGN KEY (record_id) REFERENCES transcription_records(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // 创建提示词模板表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS prompt_templates (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT NOT NULL,
                language TEXT NOT NULL,
                is_built_in BOOLEAN DEFAULT 0,
                description TEXT,
                tags TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                usage_count INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1
            )",
            [],
        )?;

        // 创建索引
        self.create_indexes(conn)?;

        Ok(())
    }

    /// 创建数据库索引
    fn create_indexes(&self, conn: &Connection) -> Result<()> {
        let indexes = vec![
            "CREATE INDEX IF NOT EXISTS idx_records_created_at ON transcription_records(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_records_status ON transcription_records(status)",
            "CREATE INDEX IF NOT EXISTS idx_records_category ON transcription_records(category)",
            "CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompt_templates(category)",
            "CREATE INDEX IF NOT EXISTS idx_prompts_language ON prompt_templates(language)",
            "CREATE INDEX IF NOT EXISTS idx_prompts_active ON prompt_templates(is_active)",
        ];

        for index_sql in indexes {
            conn.execute(index_sql, [])?;
        }

        Ok(())
    }

    /// 获取数据库版本
    fn get_database_version(&self, conn: &Connection) -> Result<i32> {
        // 检查元数据表是否存在
        let table_exists: bool = conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='database_metadata'",
            [],
            |row| row.get::<_, i32>(0).map(|count| count > 0)
        )?;

        if !table_exists {
            return Ok(0); // 老版本数据库，没有版本控制
        }

        match conn.query_row(
            "SELECT value FROM database_metadata WHERE key = 'version'",
            [],
            |row| row.get::<_, String>(0)
        ) {
            Ok(version_str) => version_str.parse::<i32>().map_err(|_| {
                rusqlite::Error::SqliteFailure(
                    rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CORRUPT),
                    Some("Invalid version format".to_string())
                )
            }),
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                Ok(0) // 版本记录不存在，认为是版本0
            },
            Err(e) => Err(e),
        }
    }

    /// 设置数据库版本
    fn set_database_version(&self, conn: &Connection, version: i32) -> Result<()> {
        conn.execute(
            "INSERT OR REPLACE INTO database_metadata (key, value, updated_at) VALUES (?1, ?2, ?3)",
            rusqlite::params!["version", version.to_string(), Utc::now().to_rfc3339()],
        )?;
        Ok(())
    }

    /// 数据库迁移
    fn migrate_database(&self, conn: &Connection, from_version: i32, to_version: i32) -> Result<()> {
        println!("开始数据库迁移：从版本 {} 到版本 {}", from_version, to_version);

        // 开始事务
        let tx = conn.unchecked_transaction()?;

        // 根据版本执行相应的迁移
        for version in (from_version + 1)..=to_version {
            match version {
                1 => {
                    // 迁移到版本1：添加元数据表和新功能
                    if from_version == 0 {
                        // 从版本0（无版本控制）迁移到版本1
                        tx.execute(
                            "CREATE TABLE IF NOT EXISTS database_metadata (
                                key TEXT PRIMARY KEY,
                                value TEXT NOT NULL,
                                updated_at TEXT NOT NULL
                            )",
                            [],
                        )?;
                        
                        // 如果有新的列或表结构变化，在这里添加
                        // 例如：ALTER TABLE transcription_records ADD COLUMN new_field TEXT;
                    }
                },
                _ => {
                    return Err(rusqlite::Error::SqliteFailure(
                        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_MISUSE),
                        Some(format!("未知的迁移版本: {}", version))
                    ));
                }
            }
        }

        // 更新版本号
        self.set_database_version(&tx, to_version)?;
        
        // 提交事务
        tx.commit()?;
        
        println!("✓ 数据库迁移完成");
        Ok(())
    }

    /// 创建数据库备份
    pub fn create_backup(&self, suffix: &str) -> Result<PathBuf> {
        if !self.db_path.exists() {
            return Err(rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CANTOPEN),
                Some("数据库文件不存在".to_string())
            ));
        }

        let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
        let backup_filename = format!("steno_backup_{}_{}.db", timestamp, suffix);
        let backup_path = self.backup_dir.join(backup_filename);

        fs::copy(&self.db_path, &backup_path)
            .map_err(|e| rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_IOERR),
                Some(format!("备份创建失败: {}", e))
            ))?;

        println!("✓ 数据库备份已创建: {}", backup_path.display());
        Ok(backup_path)
    }

    /// 恢复数据库备份
    pub fn restore_backup(&self, backup_path: &PathBuf) -> Result<()> {
        if !backup_path.exists() {
            return Err(rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CANTOPEN),
                Some("备份文件不存在".to_string())
            ));
        }

        // 验证备份文件是否为有效的SQLite数据库
        {
            let _test_conn = Connection::open(backup_path)?;
        }

        // 创建当前数据库的备份（恢复前）
        if self.db_path.exists() {
            self.create_backup("before_restore")?;
        }

        // 恢复备份
        fs::copy(backup_path, &self.db_path)
            .map_err(|e| rusqlite::Error::SqliteFailure(
                rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_IOERR),
                Some(format!("数据库恢复失败: {}", e))
            ))?;

        println!("✓ 数据库已从备份恢复: {}", backup_path.display());
        Ok(())
    }

    /// 获取所有备份文件信息
    pub fn list_backups(&self) -> Vec<(PathBuf, std::time::SystemTime)> {
        let mut backups = Vec::new();
        
        if let Ok(entries) = fs::read_dir(&self.backup_dir) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_file() && 
                       entry.path().extension().map_or(false, |ext| ext == "db") &&
                       entry.file_name().to_string_lossy().starts_with("steno_backup_") {
                        if let Ok(modified) = metadata.modified() {
                            backups.push((entry.path(), modified));
                        }
                    }
                }
            }
        }
        
        // 按修改时间倒序排列
        backups.sort_by(|a, b| b.1.cmp(&a.1));
        backups
    }

    /// 清理旧的备份文件
    fn cleanup_old_backups(&self) {
        let backups = self.list_backups();
        
        if backups.len() > Self::MAX_BACKUPS {
            let to_remove = &backups[Self::MAX_BACKUPS..];
            for (backup_path, _) in to_remove {
                if let Err(e) = fs::remove_file(backup_path) {
                    eprintln!("警告: 无法删除旧备份文件 {}: {}", backup_path.display(), e);
                } else {
                    println!("✓ 清理旧备份: {}", backup_path.display());
                }
            }
        }
    }

    /// 获取数据库信息
    pub fn get_database_info(&self) -> Result<DatabaseInfo> {
        let conn = Connection::open(&self.db_path)?;
        let version = self.get_database_version(&conn)?;
        
        let created_at = if let Ok(metadata) = fs::metadata(&self.db_path) {
            if let Ok(created) = metadata.created() {
                created.into()
            } else {
                std::time::SystemTime::now()
            }
        } else {
            std::time::SystemTime::now()
        };

        let backups = self.list_backups();
        let last_backup = backups.first().map(|(path, time)| {
            format!("{} ({})", 
                path.file_name().unwrap_or_default().to_string_lossy(),
                chrono::DateTime::<chrono::Utc>::from(*time).format("%Y-%m-%d %H:%M:%S")
            )
        });

        Ok(DatabaseInfo {
            version,
            created_at: chrono::DateTime::<chrono::Utc>::from(created_at).to_rfc3339(),
            last_backup,
            backup_count: backups.len() as i32,
        })
    }

    /// 执行数据库真空操作（优化存储空间）
    pub fn vacuum_database(&self) -> Result<()> {
        let conn = Connection::open(&self.db_path)?;
        conn.execute("VACUUM", [])?;
        println!("✓ 数据库真空操作完成");
        Ok(())
    }

    /// 检查数据库完整性
    pub fn check_integrity(&self) -> Result<bool> {
        let conn = Connection::open(&self.db_path)?;
        let result: String = conn.query_row("PRAGMA integrity_check", [], |row| row.get(0))?;
        Ok(result == "ok")
    }
}