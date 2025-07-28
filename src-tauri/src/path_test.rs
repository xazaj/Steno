use std::path::PathBuf;

/// 测试Windows安装目录配置
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(target_os = "windows")]
    fn test_windows_install_directory() {
        // 测试获取Windows安装目录
        let install_dir = get_windows_install_dir().expect("应该能获取安装目录");
        println!("安装目录: {}", install_dir.display());
        
        // 测试各子目录路径
        let data_dir = install_dir.join("data");
        let models_dir = install_dir.join("models");
        let logs_dir = install_dir.join("logs");
        
        println!("数据目录: {}", data_dir.display());
        println!("模型目录: {}", models_dir.display());
        println!("日志目录: {}", logs_dir.display());
        
        // 验证路径格式
        assert!(install_dir.is_absolute() || install_dir.to_string_lossy() == ".");
    }

    #[test]
    fn test_path_structure() {
        // 测试目录结构的一致性
        let base = PathBuf::from("test_install");
        
        let expected_structure = vec![
            base.join("data").join("steno.db"),
            base.join("data").join("backups"),
            base.join("models").join("model_config.json"),
            base.join("logs"),
        ];
        
        for path in expected_structure {
            println!("期望路径结构: {}", path.display());
            // 验证路径可以正常构造
            assert!(path.parent().is_some());
        }
    }
}

/// Windows专用：获取应用程序安装目录
#[cfg(target_os = "windows")]
fn get_windows_install_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
    // 方法1: 尝试从当前可执行文件路径获取
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            return Ok(exe_dir.to_path_buf());
        }
    }
    
    // 方法2: 使用工作目录作为备选
    if let Ok(current_dir) = std::env::current_dir() {
        return Ok(current_dir);
    }
    
    // 方法3: 最后备选 - 使用相对路径
    Ok(PathBuf::from("."))
}

/// 打印当前配置的路径信息（用于调试）
pub fn print_path_configuration() {
    println!("=== Steno Windows 路径配置 ===");
    
    #[cfg(target_os = "windows")]
    {
        if let Ok(install_dir) = get_windows_install_dir() {
            println!("📁 安装目录: {}", install_dir.display());
            println!("📊 数据目录: {}", install_dir.join("data").display());
            println!("🤖 模型目录: {}", install_dir.join("models").display());
            println!("📝 日志目录: {}", install_dir.join("logs").display());
        } else {
            println!("❌ 无法获取Windows安装目录");
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        println!("ℹ️ 非Windows平台，使用默认AppData配置");
    }
}