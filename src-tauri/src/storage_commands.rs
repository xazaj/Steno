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
    
    /// 安全的存储访问，如果未初始化则尝试自动初始化
    pub fn with_storage_auto_init<F, R>(&self, app_handle: &AppHandle, f: F) -> Result<R, String>
    where
        F: FnOnce(&StorageService) -> rusqlite::Result<R>,
    {
        let mut state = self.0.lock().unwrap();
        match state.as_ref() {
            Some(_storage) => {
                drop(state); // 释放锁
                self.with_storage(f)
            },
            None => {
                // 尝试自动初始化
                log::warn!("⚠️ 存储服务未初始化，尝试自动初始化...");
                println!("⚠️ 存储服务未初始化，尝试自动初始化...");
                match crate::storage::StorageService::new(app_handle) {
                    Ok(storage) => {
                        *state = Some(storage);
                        drop(state); // 释放锁
                        log::info!("✅ 存储服务自动初始化成功");
                        println!("✅ 存储服务自动初始化成功");
                        self.with_storage(f)
                    },
                    Err(e) => {
                        log::error!("❌ 存储服务自动初始化失败: {}", e);
                        eprintln!("❌ 存储服务自动初始化失败: {}", e);
                        Err(format!("Storage auto-initialization failed: {}", e))
                    }
                }
            }
        }
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
    storage_state.with_storage_auto_init(&app_handle, |storage| storage.get_all_records())
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

