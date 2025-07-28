use crate::database_manager::DatabaseManager;
use tauri::Manager;
use std::sync::Arc;

/// 应用生命周期管理器
pub struct AppLifecycleManager {
    db_manager: Arc<DatabaseManager>,
}

impl AppLifecycleManager {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self, rusqlite::Error> {
        let db_manager = Arc::new(DatabaseManager::new(app_handle)?);
        Ok(Self { db_manager })
    }

    /// 应用启动时的初始化操作
    pub async fn on_app_start(&self) -> Result<(), String> {
        println!("🚀 开始应用启动初始化...");

        // 1. 检查数据库完整性
        match self.db_manager.check_integrity() {
            Ok(true) => println!("✓ 数据库完整性检查通过"),
            Ok(false) => {
                println!("⚠️ 数据库完整性检查失败，尝试修复...");
                // 可以在这里添加自动修复逻辑
                return Err("数据库损坏，请联系技术支持".to_string());
            },
            Err(e) => {
                println!("❌ 数据库完整性检查出错: {}", e);
                return Err(format!("数据库检查失败: {}", e));
            }
        }

        // 2. 创建启动备份（每天最多一次）
        if self.should_create_startup_backup().await {
            match self.db_manager.create_backup("startup") {
                Ok(backup_path) => {
                    println!("✓ 启动备份已创建: {}", backup_path.display());
                },
                Err(e) => {
                    println!("⚠️ 启动备份创建失败: {}", e);
                    // 启动备份失败不应该阻止应用启动
                }
            }
        }

        // 3. 执行定期维护（可选）
        if self.should_perform_maintenance().await {
            match self.db_manager.vacuum_database() {
                Ok(_) => println!("✓ 数据库维护完成"),
                Err(e) => println!("⚠️ 数据库维护失败: {}", e),
            }
        }

        println!("✅ 应用启动初始化完成");
        Ok(())
    }

    /// 应用关闭时的清理操作
    pub async fn on_app_exit(&self) -> Result<(), String> {
        println!("🔄 开始应用关闭清理...");

        // 创建关闭备份（如果需要）
        if self.should_create_exit_backup().await {
            match self.db_manager.create_backup("exit") {
                Ok(backup_path) => {
                    println!("✓ 关闭备份已创建: {}", backup_path.display());
                },
                Err(e) => {
                    println!("⚠️ 关闭备份创建失败: {}", e);
                }
            }
        }

        println!("✅ 应用关闭清理完成");
        Ok(())
    }

    /// 判断是否应该创建启动备份
    async fn should_create_startup_backup(&self) -> bool {
        let backups = self.db_manager.list_backups();
        
        // 如果没有备份或最近的备份超过24小时，则创建新备份
        match backups.first() {
            Some((_, last_backup_time)) => {
                let now = std::time::SystemTime::now();
                let duration = now.duration_since(*last_backup_time).unwrap_or_default();
                duration.as_secs() > 24 * 60 * 60 // 24小时
            },
            None => true, // 没有备份，需要创建
        }
    }

    /// 判断是否应该创建退出备份
    async fn should_create_exit_backup(&self) -> bool {
        // 可以根据用户设置或应用使用时长来决定
        // 这里简单地检查是否有重要数据变化
        false // 暂时关闭退出备份
    }

    /// 判断是否应该执行维护
    async fn should_perform_maintenance(&self) -> bool {
        // 每周执行一次维护
        let backups = self.db_manager.list_backups();
        match backups.iter().find(|(path, _)| {
            path.file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .contains("maintenance")
        }) {
            Some((_, last_maintenance_time)) => {
                let now = std::time::SystemTime::now();
                let duration = now.duration_since(*last_maintenance_time).unwrap_or_default();
                duration.as_secs() > 7 * 24 * 60 * 60 // 7天
            },
            None => true, // 从未维护过
        }
    }

    /// 处理应用升级
    pub async fn handle_app_upgrade(&self, old_version: &str, new_version: &str) -> Result<(), String> {
        println!("🔄 处理应用升级: {} -> {}", old_version, new_version);

        // 升级前强制备份
        match self.db_manager.create_backup(&format!("upgrade_from_{}", old_version)) {
            Ok(backup_path) => {
                println!("✓ 升级前备份已创建: {}", backup_path.display());
            },
            Err(e) => {
                return Err(format!("升级前备份创建失败: {}", e));
            }
        }

        // 这里可以添加特定版本的升级逻辑
        // 例如：数据迁移、设置迁移等

        println!("✅ 应用升级处理完成");
        Ok(())
    }

    /// 紧急恢复：从最新备份恢复数据库
    pub async fn emergency_restore(&self) -> Result<(), String> {
        println!("🚨 开始紧急恢复...");

        let backups = self.db_manager.list_backups();
        if backups.is_empty() {
            return Err("没有可用的备份文件进行恢复".to_string());
        }

        // 使用最新的备份
        let (latest_backup, _) = &backups[0];
        
        match self.db_manager.restore_backup(latest_backup) {
            Ok(_) => {
                println!("✓ 数据库已从备份恢复: {}", latest_backup.display());
                Ok(())
            },
            Err(e) => {
                Err(format!("紧急恢复失败: {}", e))
            }
        }
    }
}

/// 在应用启动时调用的初始化函数
pub async fn initialize_app(app_handle: &tauri::AppHandle) -> Result<(), String> {
    let lifecycle_manager = AppLifecycleManager::new(app_handle)
        .map_err(|e| format!("初始化生命周期管理器失败: {}", e))?;

    lifecycle_manager.on_app_start().await?;

    // 将生命周期管理器存储到应用状态中，以便在应用关闭时使用
    app_handle.manage(lifecycle_manager);

    Ok(())
}

/// 应用关闭时的清理函数
pub async fn cleanup_app(app_handle: &tauri::AppHandle) -> Result<(), String> {
    if let Some(lifecycle_manager) = app_handle.try_state::<AppLifecycleManager>() {
        lifecycle_manager.on_app_exit().await?;
    }
    Ok(())
}