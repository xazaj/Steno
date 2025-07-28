use tauri::command;
use crate::database_manager::{DatabaseManager, DatabaseInfo};
use std::path::PathBuf;

/// 获取数据库信息
#[command]
pub async fn get_database_info(app_handle: tauri::AppHandle) -> Result<DatabaseInfo, String> {
    let db_manager = DatabaseManager::new(&app_handle)
        .map_err(|e| format!("Failed to create database manager: {}", e))?;
    
    db_manager.get_database_info()
        .map_err(|e| format!("Failed to get database info: {}", e))
}

/// 创建数据库备份
#[command]
pub async fn create_database_backup(app_handle: tauri::AppHandle, suffix: Option<String>) -> Result<String, String> {
    let db_manager = DatabaseManager::new(&app_handle)
        .map_err(|e| format!("Failed to create database manager: {}", e))?;
    
    let backup_suffix = suffix.unwrap_or_else(|| "manual".to_string());
    let backup_path = db_manager.create_backup(&backup_suffix)
        .map_err(|e| format!("Failed to create backup: {}", e))?;
    
    Ok(backup_path.to_string_lossy().to_string())
}

/// 列出所有备份文件
#[command]
pub async fn list_database_backups(app_handle: tauri::AppHandle) -> Result<Vec<BackupInfo>, String> {
    let db_manager = DatabaseManager::new(&app_handle)
        .map_err(|e| format!("Failed to create database manager: {}", e))?;
    
    let backups = db_manager.list_backups();
    let backup_infos: Vec<BackupInfo> = backups.into_iter().map(|(path, time)| {
        let filename = path.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        
        let created_at = chrono::DateTime::<chrono::Utc>::from(time).to_rfc3339();
        
        // 从文件大小获取备份大小
        let size = std::fs::metadata(&path)
            .map(|m| m.len())
            .unwrap_or(0);
        
        BackupInfo {
            filename,
            path: path.to_string_lossy().to_string(),
            created_at,
            size,
        }
    }).collect();
    
    Ok(backup_infos)
}

/// 恢复数据库备份
#[command]
pub async fn restore_database_backup(app_handle: tauri::AppHandle, backup_path: String) -> Result<String, String> {
    let db_manager = DatabaseManager::new(&app_handle)
        .map_err(|e| format!("Failed to create database manager: {}", e))?;
    
    let path = PathBuf::from(backup_path);
    db_manager.restore_backup(&path)
        .map_err(|e| format!("Failed to restore backup: {}", e))?;
    
    Ok("数据库备份恢复成功".to_string())
}

/// 执行数据库真空操作
#[command]
pub async fn vacuum_database(app_handle: tauri::AppHandle) -> Result<String, String> {
    let db_manager = DatabaseManager::new(&app_handle)
        .map_err(|e| format!("Failed to create database manager: {}", e))?;
    
    db_manager.vacuum_database()
        .map_err(|e| format!("Failed to vacuum database: {}", e))?;
    
    Ok("数据库真空操作完成".to_string())
}

/// 检查数据库完整性
#[command]
pub async fn check_database_integrity(app_handle: tauri::AppHandle) -> Result<bool, String> {
    let db_manager = DatabaseManager::new(&app_handle)
        .map_err(|e| format!("Failed to create database manager: {}", e))?;
    
    db_manager.check_integrity()
        .map_err(|e| format!("Failed to check database integrity: {}", e))
}

/// 删除备份文件
#[command]
pub async fn delete_database_backup(backup_path: String) -> Result<String, String> {
    let path = PathBuf::from(&backup_path);
    
    if !path.exists() {
        return Err("备份文件不存在".to_string());
    }
    
    // 安全检查：确保文件是在正确的备份目录中且是备份文件
    if !path.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .starts_with("steno_backup_") {
        return Err("只能删除Steno备份文件".to_string());
    }
    
    std::fs::remove_file(&path)
        .map_err(|e| format!("删除备份文件失败: {}", e))?;
    
    Ok(format!("备份文件已删除: {}", path.file_name().unwrap_or_default().to_string_lossy()))
}

/// 备份信息结构体
#[derive(serde::Serialize, serde::Deserialize)]
pub struct BackupInfo {
    pub filename: String,
    pub path: String,
    pub created_at: String,
    pub size: u64,
}