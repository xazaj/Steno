use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use chrono::Utc;
use tauri::Manager;
use log::LevelFilter;
use env_logger::{Builder, Target};

/// 初始化日志系统，将日志写入应用数据目录
pub fn init_logging(app_handle: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // 获取应用数据目录
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    // 创建日志目录
    let log_dir = app_data_dir.join("logs");
    fs::create_dir_all(&log_dir)
        .map_err(|e| format!("Failed to create log directory: {}", e))?;

    // 创建日志文件（按日期命名）
    let log_file_name = format!("steno_{}.log", Utc::now().format("%Y%m%d"));
    let log_file_path = log_dir.join(log_file_name);

    // 打开日志文件（追加模式）
    let log_file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file_path)
        .map_err(|e| format!("Failed to open log file: {}", e))?;

    // 配置env_logger写入文件
    Builder::from_default_env()
        .target(Target::Pipe(Box::new(log_file)))
        .filter_level(LevelFilter::Info)
        .format(|buf, record| {
            writeln!(
                buf,
                "[{}] [{}] [{}:{}] - {}",
                Utc::now().format("%Y-%m-%d %H:%M:%S%.3f"),
                record.level(),
                record.file().unwrap_or("unknown"),
                record.line().unwrap_or(0),
                record.args()
            )
        })
        .init();

    // 同时输出到stderr供调试使用
    eprintln!("📝 日志系统已初始化，日志文件: {}", log_file_path.display());
    log::info!("=== Steno 应用启动 ===");
    log::info!("日志文件位置: {}", log_file_path.display());
    
    // 清理旧日志文件（保留最近7天）
    cleanup_old_logs(&log_dir)?;

    Ok(())
}

/// 清理超过7天的旧日志文件
fn cleanup_old_logs(log_dir: &PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    let now = std::time::SystemTime::now();
    let seven_days = std::time::Duration::from_secs(7 * 24 * 60 * 60);

    if let Ok(entries) = fs::read_dir(log_dir) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    if let Some(file_name) = entry.file_name().to_str() {
                        if file_name.starts_with("steno_") && file_name.ends_with(".log") {
                            if let Ok(modified) = metadata.modified() {
                                if let Ok(age) = now.duration_since(modified) {
                                    if age > seven_days {
                                        if let Err(e) = fs::remove_file(entry.path()) {
                                            log::warn!("无法删除旧日志文件 {}: {}", entry.path().display(), e);
                                        } else {
                                            log::info!("已删除旧日志文件: {}", entry.path().display());
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

/// 记录应用关闭信息
pub fn log_app_shutdown() {
    log::info!("=== Steno 应用正常关闭 ===");
}

/// 记录应用崩溃信息
pub fn log_app_crash(error: &str) {
    log::error!("=== Steno 应用异常退出 ===");
    log::error!("错误信息: {}", error);
    
    // 也输出到stderr确保能看到
    eprintln!("💥 应用崩溃: {}", error);
}

/// 为关键操作记录日志的宏
#[macro_export]
macro_rules! log_operation {
    ($op:expr, $result:expr) => {
        match $result {
            Ok(val) => {
                log::info!("✅ {} - 成功", $op);
                Ok(val)
            },
            Err(e) => {
                log::error!("❌ {} - 失败: {}", $op, e);
                Err(e)
            }
        }
    };
}