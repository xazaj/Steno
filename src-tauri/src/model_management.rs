use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};
use tauri::{command, Emitter, WebviewWindow};
use reqwest::Client;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_current: bool,
    pub display_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageInfo {
    pub used_space: u64,
    pub total_space: u64,
    pub available_space: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct DownloadProgress {
    pub model_name: String,
    pub downloaded: u64,
    pub total: u64,
    pub speed: f64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub current_model: String,
    pub model_path: PathBuf,
    pub installed_models: Vec<ModelInfo>,
    pub download_path: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalModel {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub valid: bool,
}

pub struct ModelManager {
    pub config: Arc<Mutex<ModelConfig>>,
    pub client: Client,
}

impl Default for ModelManager {
    fn default() -> Self {
        let models_dir = get_models_directory();
        let config = ModelConfig {
            current_model: "ggml-large-v3".to_string(),
            model_path: models_dir.join("ggml-large-v3.bin"),
            installed_models: Vec::new(),
            download_path: models_dir,
        };

        Self {
            config: Arc::new(Mutex::new(config)),
            client: Client::new(),
        }
    }
}

fn get_models_directory() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        // Windows: 使用安装目录下的models子目录
        get_windows_install_dir()
            .map(|install_dir| install_dir.join("models"))
            .unwrap_or_else(|_| PathBuf::from("./models"))
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS: ~/Library/Application Support/Steno
        dirs::home_dir()
            .map(|h| h.join("Library").join("Application Support").join("Steno").join("models"))
            .unwrap_or_else(|| PathBuf::from("./models"))
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        // Linux: ~/.local/share/steno
        dirs::data_dir()
            .map(|d| d.join("steno").join("models"))
            .unwrap_or_else(|| PathBuf::from("./models"))
    }
}

/// Windows专用：获取合适的数据存储目录
#[cfg(target_os = "windows")]
fn get_windows_install_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
    // 策略1：优先使用用户AppData目录（推荐，符合Windows最佳实践）
    // %APPDATA%\Roaming\Steno - 适合模型文件存储
    if let Some(app_data) = dirs::data_dir() {
        return Ok(app_data.join("Steno"));
    }
    
    // 策略2：备选使用Local AppData目录（更快的本地存储）
    if let Some(local_data) = dirs::data_local_dir() {
        return Ok(local_data.join("Steno"));
    }
    
    // 策略3：便携模式检查（仅当可执行文件目录可写或有便携标记时使用）
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            // 检查是否存在便携模式标记文件或可执行文件目录可写
            let portable_marker = exe_dir.join("portable.txt");
            let test_file = exe_dir.join("write_test.tmp");
            
            if portable_marker.exists() || std::fs::File::create(&test_file).is_ok() {
                let _ = std::fs::remove_file(&test_file); // 清理测试文件
                return Ok(exe_dir.to_path_buf());
            }
        }
    }
    
    // 策略4: 使用用户文档目录
    if let Some(docs_dir) = dirs::document_dir() {
        return Ok(docs_dir.join("Steno"));
    }
    
    // 策略5: 开发环境回退到工作目录
    if let Ok(current_dir) = std::env::current_dir() {
        return Ok(current_dir);
    }
    
    // 最后备选：相对路径
    Ok(PathBuf::from("."))
}

fn get_config_path() -> PathBuf {
    get_models_directory().join("model_config.json")
}

impl ModelManager {
    pub fn new() -> Self {
        let mut manager = Self::default();
        manager.load_config();
        manager
    }

    pub fn load_config(&mut self) {
        let config_path = get_config_path();
        if config_path.exists() {
            if let Ok(content) = fs::read_to_string(&config_path) {
                if let Ok(config) = serde_json::from_str::<ModelConfig>(&content) {
                    *self.config.lock().unwrap() = config;
                    return;
                }
            }
        }
        self.save_config();
    }

    pub fn save_config(&self) {
        let config = self.config.lock().unwrap();
        let config_path = get_config_path();
        
        if let Some(parent) = config_path.parent() {
            let _ = fs::create_dir_all(parent);
        }

        if let Ok(content) = serde_json::to_string_pretty(&*config) {
            let _ = fs::write(&config_path, content);
        }
    }

    pub fn scan_installed_models(&self) -> Vec<ModelInfo> {
        let models_dir = get_models_directory();
        let mut models = Vec::new();
        
        if !models_dir.exists() {
            let _ = fs::create_dir_all(&models_dir);
            return models;
        }

        if let Ok(entries) = fs::read_dir(&models_dir) {
            let current_model = &self.config.lock().unwrap().current_model;
            
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    if path.is_file() && path.extension().map_or(false, |ext| ext == "bin") {
                        if let Some(name) = path.file_stem().and_then(|n| n.to_str()) {
                            let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                            let is_current = name == current_model;
                            
                            // 生成更友好的显示名称
                            let display_name = match name {
                                "ggml-tiny" => "Tiny (39MB - 快速，质量较低)",
                                "ggml-tiny.en" => "Tiny English (39MB - 快速，仅英文)",
                                "ggml-base" => "Base (74MB - 平衡性能)",
                                "ggml-base.en" => "Base English (74MB - 平衡性能，仅英文)",
                                "ggml-small" => "Small (244MB - 高质量)",
                                "ggml-small.en" => "Small English (244MB - 高质量，仅英文)",
                                "ggml-medium" => "Medium (769MB - 极高质量)",
                                "ggml-medium.en" => "Medium English (769MB - 极高质量，仅英文)",
                                "ggml-large-v1" => "Large v1 (1.5GB - 顶级质量)",
                                "ggml-large-v2" => "Large v2 (1.5GB - 顶级质量，改进版)",
                                "ggml-large-v3" => "Large v3 (1.5GB - 最新顶级质量)",
                                _ => name // 对于未知模型，使用原始名称
                            };
                            
                            models.push(ModelInfo {
                                name: name.to_string(),
                                path: path.to_string_lossy().to_string(),
                                size,
                                is_current,
                                display_name: display_name.to_string(),
                            });
                        }
                    }
                }
            }
        }

        models.sort_by(|a, b| a.name.cmp(&b.name));
        models
    }

    pub fn get_storage_info(&self) -> io::Result<StorageInfo> {
        let models_dir = get_models_directory();
        
        if !models_dir.exists() {
            fs::create_dir_all(&models_dir)?;
        }

        let mut used_space = 0u64;
        if let Ok(entries) = fs::read_dir(&models_dir) {
            for entry in entries {
                if let Ok(entry) = entry {
                    if let Ok(metadata) = entry.metadata() {
                        if metadata.is_file() {
                            used_space += metadata.len();
                        }
                    }
                }
            }
        }

        // 获取磁盘总空间和可用空间 (简化版本，使用固定值)
        // 在实际应用中，可以使用系统API获取真实的磁盘空间
        let total_space = 100 * 1024 * 1024 * 1024u64; // 100GB 假设总空间
        let available_space = total_space - used_space; // 简化计算

        Ok(StorageInfo {
            used_space,
            total_space,
            available_space,
        })
    }

    pub async fn download_model(&self, window: &WebviewWindow, model_name: &str, url: &str) -> Result<(), String> {
        let models_dir = get_models_directory();
        if !models_dir.exists() {
            fs::create_dir_all(&models_dir).map_err(|e| format!("创建模型目录失败: {}", e))?;
        }

        let file_path = models_dir.join(format!("{}.bin", model_name));
        
        // 发送开始下载事件
        let _ = window.emit("model_download_progress", DownloadProgress {
            model_name: model_name.to_string(),
            downloaded: 0,
            total: 0,
            speed: 0.0,
            status: "downloading".to_string(),
        });

        let response = self.client.get(url).send().await
            .map_err(|e| format!("请求失败: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("下载失败: HTTP {}", response.status()));
        }

        let total_size = response.content_length().unwrap_or(0);
        let mut file = File::create(&file_path)
            .map_err(|e| format!("创建文件失败: {}", e))?;

        let mut downloaded = 0u64;
        let mut last_update = std::time::Instant::now();
        let mut speed_samples = Vec::new();
        
        let mut stream = response.bytes_stream();
        use futures_util::stream::StreamExt;

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result.map_err(|e| format!("下载数据失败: {}", e))?;
            
            file.write_all(&chunk).map_err(|e| format!("写入文件失败: {}", e))?;
            downloaded += chunk.len() as u64;

            // 计算下载速度和发送进度更新
            let now = std::time::Instant::now();
            if now.duration_since(last_update).as_millis() >= 500 { // 每500ms更新一次
                let duration = now.duration_since(last_update).as_secs_f64();
                let speed = chunk.len() as f64 / duration;
                
                speed_samples.push(speed);
                if speed_samples.len() > 10 {
                    speed_samples.remove(0);
                }
                
                let avg_speed = speed_samples.iter().sum::<f64>() / speed_samples.len() as f64;
                
                let _ = window.emit("model_download_progress", DownloadProgress {
                    model_name: model_name.to_string(),
                    downloaded,
                    total: total_size,
                    speed: avg_speed,
                    status: "downloading".to_string(),
                });
                
                last_update = now;
            }
        }

        // 下载完成
        let _ = window.emit("model_download_progress", DownloadProgress {
            model_name: model_name.to_string(),
            downloaded,
            total: total_size,
            speed: 0.0,
            status: "completed".to_string(),
        });

        Ok(())
    }

    pub fn switch_model(&self, model_path: &str) -> Result<(), String> {
        let path = Path::new(model_path);
        if !path.exists() {
            return Err("模型文件不存在".to_string());
        }

        let model_name = path.file_stem()
            .and_then(|s| s.to_str())
            .ok_or("无效的模型文件名")?;

        let mut config = self.config.lock().unwrap();
        config.current_model = model_name.to_string();
        config.model_path = path.to_path_buf();
        drop(config);

        self.save_config();
        Ok(())
    }

    pub fn delete_model(&self, model_path: &str) -> Result<(), String> {
        let path = Path::new(model_path);
        
        // 检查是否是当前使用的模型
        let config = self.config.lock().unwrap();
        if config.model_path == path {
            return Err("无法删除当前使用的模型".to_string());
        }
        drop(config);

        if !path.exists() {
            return Err("模型文件不存在".to_string());
        }

        fs::remove_file(path).map_err(|e| format!("删除文件失败: {}", e))?;
        Ok(())
    }

    pub fn scan_local_models(&self, folder_path: &str) -> Result<Vec<LocalModel>, String> {
        let folder = Path::new(folder_path);
        
        if !folder.exists() || !folder.is_dir() {
            return Err("指定的路径不存在或不是文件夹".to_string());
        }

        let mut models = Vec::new();

        if let Ok(entries) = fs::read_dir(folder) {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    
                    if path.is_file() {
                        if let Some(extension) = path.extension() {
                            if extension == "bin" {
                                let file_name = path.file_name()
                                    .and_then(|n| n.to_str())
                                    .unwrap_or("unknown");
                                
                                let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                                let valid = self.is_valid_whisper_model(&path);
                                
                                models.push(LocalModel {
                                    name: file_name.to_string(),
                                    path: path.to_string_lossy().to_string(),
                                    size,
                                    valid,
                                });
                            }
                        }
                    }
                }
            }
        }

        // 按名称排序
        models.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(models)
    }

    fn is_valid_whisper_model(&self, file_path: &Path) -> bool {
        // 简单的验证：检查文件大小和扩展名
        if let Ok(metadata) = fs::metadata(file_path) {
            let size = metadata.len();
            
            // Whisper模型文件至少应该有几MB大小
            if size < 1_000_000 {  // 1MB
                return false;
            }

            // 检查文件名是否符合whisper模型命名规范
            if let Some(file_name) = file_path.file_name().and_then(|n| n.to_str()) {
                return file_name.starts_with("ggml-") && file_name.ends_with(".bin");
            }
        }
        
        false
    }

    pub fn import_local_model(&self, model_path: &str, model_name: &str) -> Result<(), String> {
        let source_path = Path::new(model_path);
        
        if !source_path.exists() {
            return Err("源文件不存在".to_string());
        }

        // 获取模型目录
        let models_dir = get_models_directory();
        if !models_dir.exists() {
            fs::create_dir_all(&models_dir).map_err(|e| format!("创建模型目录失败: {}", e))?;
        }

        // 目标文件路径
        let target_path = models_dir.join(model_name);
        
        // 检查是否已存在同名文件
        if target_path.exists() {
            return Err(format!("模型 {} 已存在", model_name));
        }

        // 复制文件
        fs::copy(source_path, &target_path)
            .map_err(|e| format!("复制文件失败: {}", e))?;

        Ok(())
    }

    // 获取当前模型信息
    pub fn get_current_model(&self) -> Option<ModelInfo> {
        let models = self.scan_installed_models();
        models.into_iter().find(|model| model.is_current)
    }

    // 获取当前模型路径（用于初始化）
    pub fn get_current_model_path(&self) -> PathBuf {
        let config = self.config.lock().unwrap();
        config.model_path.clone()
    }
}

// Tauri 命令
#[command]
pub async fn list_installed_models(
    model_manager: tauri::State<'_, Arc<Mutex<ModelManager>>>,
) -> Result<Vec<ModelInfo>, String> {
    let manager = model_manager.lock().unwrap();
    Ok(manager.scan_installed_models())
}

#[command] 
pub async fn get_storage_info(
    model_manager: tauri::State<'_, Arc<Mutex<ModelManager>>>,
) -> Result<StorageInfo, String> {
    let manager = model_manager.lock().unwrap();
    manager.get_storage_info().map_err(|e| e.to_string())
}

#[command]
pub async fn download_model(
    window: WebviewWindow,
    model_manager: tauri::State<'_, Arc<Mutex<ModelManager>>>,
    model_name: String,
    url: String,
) -> Result<(), String> {
    let manager = {
        let guard = model_manager.lock().unwrap();
        ModelManager {
            config: guard.config.clone(),
            client: guard.client.clone(),
        }
    };
    
    manager.download_model(&window, &model_name, &url).await?;
    Ok(())
}

#[command]
pub async fn switch_model(
    model_manager: tauri::State<'_, Arc<Mutex<ModelManager>>>,
    whisper_context: tauri::State<'_, crate::WhisperContextState>,
    model_path: String,
) -> Result<(), String> {
    let manager = model_manager.lock().unwrap();
    manager.switch_model(&model_path)?;
    
    // 重新初始化whisper上下文
    whisper_context.reinitialize(&model_path)?;
    
    Ok(())
}

#[command]
pub async fn delete_model(
    model_manager: tauri::State<'_, Arc<Mutex<ModelManager>>>,
    model_path: String,
) -> Result<(), String> {
    let manager = model_manager.lock().unwrap();
    manager.delete_model(&model_path)
}

#[command]
pub async fn scan_local_models(
    model_manager: tauri::State<'_, Arc<Mutex<ModelManager>>>,
    folder_path: String,
) -> Result<Vec<LocalModel>, String> {
    let manager = model_manager.lock().unwrap();
    manager.scan_local_models(&folder_path)
}

#[command]
pub async fn import_local_model(
    model_manager: tauri::State<'_, Arc<Mutex<ModelManager>>>,
    model_path: String,
    model_name: String,
) -> Result<(), String> {
    let manager = model_manager.lock().unwrap();
    manager.import_local_model(&model_path, &model_name)
}

#[command]
pub async fn get_current_model(
    model_manager: tauri::State<'_, Arc<Mutex<ModelManager>>>,
) -> Result<Option<ModelInfo>, String> {
    let manager = model_manager.lock().unwrap();
    Ok(manager.get_current_model())
}