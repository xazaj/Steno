use crate::storage::{StorageService, TranscriptionRecord, TranscriptionResult, PromptTemplate};
use std::sync::Mutex;
use tauri::{AppHandle, State};

pub struct StorageState(pub Mutex<Option<StorageService>>);

impl StorageState {
    pub fn new() -> Self {
        Self(Mutex::new(None))
    }

    pub fn init(&self, app_handle: &AppHandle) -> Result<(), String> {
        let storage = StorageService::new(app_handle)
            .map_err(|e| format!("Failed to initialize storage: {}", e))?;
        
        let mut state = self.0.lock().unwrap();
        *state = Some(storage);
        Ok(())
    }

    pub fn with_storage<F, R>(&self, f: F) -> Result<R, String>
    where
        F: FnOnce(&StorageService) -> rusqlite::Result<R>,
    {
        let state = self.0.lock().unwrap();
        match state.as_ref() {
            Some(storage) => f(storage).map_err(|e| format!("Storage error: {}", e)),
            None => Err("Storage not initialized. Please ensure the application has fully started.".to_string()),
        }
    }
    
    /// 可靠的存储访问 - 统一跨平台自动初始化逻辑
    pub fn with_storage_reliable<F, R>(&self, app_handle: &AppHandle, mut f: F) -> Result<R, String>
    where
        F: FnMut(&StorageService) -> rusqlite::Result<R>,
    {
        // 第一次尝试：检查是否已初始化
        {
            let state = self.0.lock().unwrap();
            if let Some(storage) = state.as_ref() {
                match f(storage) {
                    Ok(result) => return Ok(result),
                    Err(e) => return Err(format!("Storage error: {}", e)),
                }
            }
        }
        
        // 自动重新初始化（跨平台统一逻辑）
        log::warn!("🔄 存储未初始化，尝试自动初始化...");
        println!("🔄 存储未初始化，尝试自动初始化...");
        
        // 使用重试机制确保初始化成功
        for attempt in 1..=3 {
            match self.init_with_retry(app_handle, attempt) {
                Ok(_) => {
                    log::info!("✅ 存储服务自动初始化成功 (尝试 {})", attempt);
                    println!("✅ 存储服务自动初始化成功 (尝试 {})", attempt);
                    
                    // 第二次尝试执行操作
                    let state = self.0.lock().unwrap();
                    if let Some(storage) = state.as_ref() {
                        match f(storage) {
                            Ok(result) => return Ok(result),
                            Err(e) => return Err(format!("Storage error: {}", e)),
                        }
                    } else {
                        return Err("Storage still not initialized after successful init".to_string());
                    }
                },
                Err(e) => {
                    if attempt == 3 {
                        log::error!("❌ 存储服务初始化最终失败: {}", e);
                        eprintln!("❌ 存储服务初始化最终失败: {}", e);
                        return Err(format!("Storage initialization failed after {} attempts: {}", attempt, e));
                    } else {
                        log::warn!("⚠️ 存储服务初始化失败 (尝试 {}/3): {}", attempt, e);
                        // 短暂等待后重试
                        std::thread::sleep(std::time::Duration::from_millis(100 * attempt as u64));
                    }
                }
            }
        }
        
        Err("Storage initialization failed after all retry attempts".to_string())
    }
    
    /// 带重试机制的初始化
    fn init_with_retry(&self, app_handle: &AppHandle, attempt: u32) -> Result<(), String> {
        let mut state = self.0.lock().unwrap();
        
        // 如果已经初始化了，直接返回成功
        if state.is_some() {
            return Ok(());
        }
        
        match crate::storage::StorageService::new(app_handle) {
            Ok(storage) => {
                *state = Some(storage);
                Ok(())
            },
            Err(e) => {
                Err(format!("Attempt {}: {}", attempt, e))
            }
        }
    }
    
    /// 安全的存储访问，如果未初始化则尝试自动初始化（保持向后兼容）
    pub fn with_storage_auto_init<F, R>(&self, app_handle: &AppHandle, f: F) -> Result<R, String>
    where
        F: FnMut(&StorageService) -> rusqlite::Result<R>,
    {
        // 委托给新的可靠方法
        self.with_storage_reliable(app_handle, f)
    }
}

#[tauri::command]
pub async fn init_storage(
    app_handle: AppHandle,
    storage_state: State<'_, StorageState>,
) -> Result<(), String> {
    storage_state.init(&app_handle)
}

#[tauri::command]
pub async fn save_transcription_record(
    record: TranscriptionRecord,
    storage_state: State<'_, StorageState>,
) -> Result<(), String> {
    storage_state.with_storage(|storage| storage.save_record(&record))
}

#[tauri::command]
pub async fn get_transcription_record(
    id: String,
    storage_state: State<'_, StorageState>,
) -> Result<Option<TranscriptionRecord>, String> {
    storage_state.with_storage(|storage| storage.get_record(&id))
}

#[tauri::command]
pub async fn get_all_transcription_records(
    app_handle: AppHandle,
    storage_state: State<'_, StorageState>,
) -> Result<Vec<TranscriptionRecord>, String> {
    storage_state.with_storage_reliable(&app_handle, |storage| storage.get_all_records())
}

#[tauri::command]
pub async fn update_transcription_status(
    id: String,
    status: String,
    progress: f64,
    error: Option<String>,
    storage_state: State<'_, StorageState>,
) -> Result<(), String> {
    storage_state.with_storage(|storage| {
        storage.update_record_status(&id, &status, progress, error.as_deref())
    })
}

#[tauri::command]
pub async fn update_transcription_result(
    id: String,
    result: TranscriptionResult,
    storage_state: State<'_, StorageState>,
) -> Result<(), String> {
    storage_state.with_storage(|storage| storage.update_record_result(&id, &result))
}

#[tauri::command]
pub async fn delete_transcription_record(
    id: String,
    storage_state: State<'_, StorageState>,
) -> Result<(), String> {
    storage_state.with_storage(|storage| storage.delete_record(&id))
}

#[tauri::command]
pub async fn toggle_transcription_star(
    id: String,
    storage_state: State<'_, StorageState>,
) -> Result<bool, String> {
    storage_state.with_storage(|storage| storage.toggle_star(&id))
}

#[tauri::command]
pub async fn update_transcription_name(
    id: String,
    name: String,
    storage_state: State<'_, StorageState>,
) -> Result<(), String> {
    storage_state.with_storage(|storage| storage.update_record_name(&id, &name))
}

#[tauri::command]
pub async fn search_transcription_records(
    query: String,
    category: Option<String>,
    storage_state: State<'_, StorageState>,
) -> Result<Vec<TranscriptionRecord>, String> {
    storage_state.with_storage(|storage| {
        let mut records = storage.get_all_records()?;
        
        // 按分类过滤
        if let Some(cat) = category {
            match cat.as_str() {
                "all" => {},
                "today" => {
                    let today = chrono::Utc::now().date_naive();
                    records.retain(|r| r.created_at.date_naive() == today);
                },
                "week" => {
                    let week_ago = chrono::Utc::now() - chrono::Duration::days(7);
                    records.retain(|r| r.created_at >= week_ago);
                },
                "starred" => {
                    records.retain(|r| r.is_starred);
                },
                _ => {
                    records.retain(|r| r.category.as_deref() == Some(&cat));
                }
            }
        }
        
        // 按搜索关键词过滤
        if !query.trim().is_empty() {
            let query_lower = query.to_lowercase();
            records.retain(|r| {
                r.name.to_lowercase().contains(&query_lower) ||
                r.original_file_name.to_lowercase().contains(&query_lower) ||
                r.tags.iter().any(|tag| tag.to_lowercase().contains(&query_lower)) ||
                r.result.as_ref()
                    .map(|res| res.text.to_lowercase().contains(&query_lower))
                    .unwrap_or(false)
            });
        }
        
        Ok(records)
    })
}

// ========== 提示词管理相关命令 ==========

#[tauri::command]
pub async fn get_prompt_templates(
    storage_state: State<'_, StorageState>,
) -> Result<Vec<PromptTemplate>, String> {
    storage_state.with_storage(|storage| storage.get_prompt_templates())
}

#[tauri::command]
pub async fn get_prompts_by_filter(
    category: Option<String>,
    language: Option<String>,
    storage_state: State<'_, StorageState>,
) -> Result<Vec<PromptTemplate>, String> {
    storage_state.with_storage(|storage| {
        storage.get_prompts_by_filter(
            category.as_deref(),
            language.as_deref()
        )
    })
}

#[tauri::command]
pub async fn save_prompt_template(
    prompt: PromptTemplate,
    storage_state: State<'_, StorageState>,
) -> Result<(), String> {
    storage_state.with_storage(|storage| storage.save_prompt_template(&prompt))
}

#[tauri::command]
pub async fn get_prompt_template(
    id: String,
    storage_state: State<'_, StorageState>,
) -> Result<Option<PromptTemplate>, String> {
    storage_state.with_storage(|storage| storage.get_prompt_template(&id))
}

#[tauri::command]
pub async fn delete_prompt_template(
    id: String,
    storage_state: State<'_, StorageState>,
) -> Result<(), String> {
    storage_state.with_storage(|storage| storage.delete_prompt_template(&id))
}

#[tauri::command]
pub async fn search_prompt_templates(
    query: String,
    storage_state: State<'_, StorageState>,
) -> Result<Vec<PromptTemplate>, String> {
    storage_state.with_storage(|storage| storage.search_prompt_templates(&query))
}

#[tauri::command]
pub async fn increment_prompt_usage(
    id: String,
    storage_state: State<'_, StorageState>,
) -> Result<(), String> {
    storage_state.with_storage(|storage| storage.increment_prompt_usage(&id))
}

