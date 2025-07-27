use crate::long_audio::{LONG_AUDIO_PROCESSOR, ProcessingConfig};
use tauri::WebviewWindow;
use serde_json::Value;

#[tauri::command]
pub async fn create_long_audio_task(
    record_id: String,
    file_path: String,
    config: Value,
    window: WebviewWindow,
) -> Result<String, String> {
    // 解析配置
    let processing_config = ProcessingConfig {
        language: config.get("language")
            .and_then(|v| v.as_str())
            .unwrap_or("auto")
            .to_string(),
        model_mode: config.get("mode")
            .and_then(|v| v.as_str())
            .unwrap_or("normal")
            .to_string(),
        audio_enhancement: config.get("audioEnhancement")
            .and_then(|v| v.as_bool())
            .unwrap_or(true),
        ..Default::default()
    };

    LONG_AUDIO_PROCESSOR
        .create_task(record_id, file_path, processing_config, &window)
        .await
}

#[tauri::command]
pub async fn start_long_audio_task(
    task_id: String,
    window: WebviewWindow,
) -> Result<(), String> {
    LONG_AUDIO_PROCESSOR
        .start_task(task_id, window)
        .await
}

#[tauri::command]
pub async fn pause_long_audio_task(
    task_id: String,
) -> Result<(), String> {
    LONG_AUDIO_PROCESSOR
        .pause_task(task_id)
        .await
}

#[tauri::command]
pub async fn resume_long_audio_task(
    task_id: String,
    window: WebviewWindow,
) -> Result<(), String> {
    LONG_AUDIO_PROCESSOR
        .resume_task(task_id, window)
        .await
}

#[tauri::command]
pub async fn cancel_long_audio_task(
    task_id: String,
) -> Result<(), String> {
    LONG_AUDIO_PROCESSOR
        .cancel_task(task_id)
        .await
}

#[tauri::command]
pub async fn get_long_audio_task(
    task_id: String,
) -> Result<Option<crate::long_audio::LongAudioTask>, String> {
    Ok(LONG_AUDIO_PROCESSOR.get_task(&task_id).await)
}

#[tauri::command]
pub async fn get_all_long_audio_tasks() -> Result<Vec<crate::long_audio::LongAudioTask>, String> {
    Ok(LONG_AUDIO_PROCESSOR.get_all_tasks().await)
}