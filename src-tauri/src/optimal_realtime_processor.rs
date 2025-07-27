// optimal_realtime_processor.rs - 最优实时转录处理器
use cpal::{Device, StreamConfig, SampleRate};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::{Arc, Mutex, mpsc};
use std::thread;
use std::time::{Duration, Instant};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

use crate::audio_processing::{AudioProcessingPipeline, SpeechSegment};
use crate::layered_processor::{UnifiedProcessor, ProcessingEvent};
use crate::context_processor::ContextAwareProcessor;
use crate::result_manager::{ResultManager, ManagedTranscriptSegment, QualityReport};
use crate::WhisperContextState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimalRealtimeConfig {
    pub language: String,
    pub enable_speaker_diarization: bool,
    pub enable_context_awareness: bool,
    pub quality_threshold: f32,
    pub max_segment_duration: u64, // milliseconds
    pub buffer_duration: u64, // milliseconds
    pub initial_prompt: Option<String>, // 添加提示词支持
}

impl Default for OptimalRealtimeConfig {
    fn default() -> Self {
        Self {
            language: "zh".to_string(),
            enable_speaker_diarization: true,
            enable_context_awareness: true,
            quality_threshold: 0.7,
            max_segment_duration: 10000, // 10秒
            buffer_duration: 300000, // 5分钟
            initial_prompt: None, // 默认不使用提示词
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealtimeTranscriptionEvent {
    pub event_type: String,
    pub data: serde_json::Value,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioLevelEvent {
    pub level: f32,
    pub speech_probability: f32,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResultEvent {
    pub segment_id: String,
    pub text: String,
    pub confidence: f32,
    pub is_temporary: bool,
    pub speaker: Option<String>,
    pub timestamp: u64,
    pub processing_time_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingStatsEvent {
    pub segments_processed: u32,
    pub avg_processing_time: u64,
    pub quality_report: QualityReport,
    pub speaker_count: usize,
    pub buffer_usage: f32,
}

/// 最优实时转录处理器
pub struct OptimalRealtimeProcessor {
    device: Device,
    config: StreamConfig,
    // 移除 stream，因为它不是 Send
    
    // 状态管理
    is_recording: Arc<Mutex<bool>>,
    is_paused: Arc<Mutex<bool>>,
    
    // 核心处理组件
    audio_pipeline: Arc<Mutex<AudioProcessingPipeline>>,
    unified_processor: Arc<Mutex<UnifiedProcessor>>,
    context_processor: Arc<Mutex<ContextAwareProcessor>>,
    result_manager: Arc<Mutex<ResultManager>>,
    
    // 通信
    app_handle: AppHandle,
    config_settings: OptimalRealtimeConfig,
    
    // 统计信息
    start_time: Option<Instant>,
    segments_processed: Arc<Mutex<u32>>,
}

// 确保类型是 Send 和 Sync
unsafe impl Send for OptimalRealtimeProcessor {}
unsafe impl Sync for OptimalRealtimeProcessor {}

impl OptimalRealtimeProcessor {
    pub fn new(
        app_handle: AppHandle,
        config: OptimalRealtimeConfig,
        whisper_state: &WhisperContextState,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        // 设置音频设备
        let host = cpal::default_host();
        let device = host.default_input_device()
            .ok_or("No input device available")?;

        let stream_config = StreamConfig {
            channels: 1,
            sample_rate: SampleRate(16000),
            buffer_size: cpal::BufferSize::Fixed(512),
        };

        // 初始化处理组件
        let audio_pipeline = Arc::new(Mutex::new(AudioProcessingPipeline::new()));
        
        let unified_processor = Arc::new(Mutex::new(
            UnifiedProcessor::new(whisper_state.get_context_ptr() as *mut std::ffi::c_void, config.language.clone(), config.initial_prompt.clone())?
        ));
        
        let context_processor = Arc::new(Mutex::new(ContextAwareProcessor::new()));
        
        let result_manager = Arc::new(Mutex::new(ResultManager::new(1000))); // 最多保存1000个段落

        Ok(Self {
            device,
            config: stream_config,
            is_recording: Arc::new(Mutex::new(false)),
            is_paused: Arc::new(Mutex::new(false)),
            audio_pipeline,
            unified_processor,
            context_processor,
            result_manager,
            app_handle,
            config_settings: config,
            start_time: None,
            segments_processed: Arc::new(Mutex::new(0)),
        })
    }

    pub fn start_recording(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        *self.is_recording.lock().unwrap() = true;
        *self.is_paused.lock().unwrap() = false;
        self.start_time = Some(Instant::now());

        // 启动处理器
        if let Ok(processor) = self.unified_processor.lock() {
            processor.start();
        }

        // 重置统计
        *self.segments_processed.lock().unwrap() = 0;

        // 设置音频流
        let is_recording_stream = self.is_recording.clone();
        let is_paused_stream = self.is_paused.clone();
        let audio_pipeline = self.audio_pipeline.clone();
        let _app_handle = self.app_handle.clone();

        let (audio_tx, audio_rx) = mpsc::channel::<Vec<f32>>();
        let (level_tx, level_rx) = mpsc::channel::<AudioLevelEvent>();

        // 创建音频输入流
        let stream = self.device.build_input_stream(
            &self.config,
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                let recording = *is_recording_stream.lock().unwrap();
                let paused = *is_paused_stream.lock().unwrap();

                if recording && !paused {
                    // 发送音频数据到处理线程
                    let _ = audio_tx.send(data.to_vec());

                    // 计算实时音频级别
                    if let Ok(pipeline) = audio_pipeline.try_lock() {
                        let speech_probability = pipeline.get_speech_probability();
                        let level = data.iter().map(|&x| x.abs()).sum::<f32>() / data.len() as f32;
                        
                        let level_event = AudioLevelEvent {
                            level: level * 10.0,
                            speech_probability,
                            timestamp: std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap()
                                .as_millis() as u64,
                        };
                        
                        let _ = level_tx.send(level_event);
                    }
                }
            },
            |err| eprintln!("Audio stream error: {}", err),
            None,
        )?;

        stream.play()?;
        // 注意：我们不再存储 stream，因为它不是 Send
        // 但这意味着我们无法在 stop_recording 中显式停止它
        // stream 会在作用域结束时自动析构

        // 启动音频级别监控线程
        self.start_audio_level_thread(level_rx);

        // 启动主处理线程
        self.start_main_processing_thread(audio_rx);

        // 启动统计报告线程
        self.start_stats_thread();

        Ok(())
    }

    pub fn pause_recording(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        *self.is_paused.lock().unwrap() = true;
        self.emit_event("recording_paused", serde_json::json!({}));
        Ok(())
    }

    pub fn resume_recording(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        *self.is_paused.lock().unwrap() = false;
        self.emit_event("recording_resumed", serde_json::json!({}));
        Ok(())
    }

    pub fn stop_recording(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        *self.is_recording.lock().unwrap() = false;
        *self.is_paused.lock().unwrap() = false;

        // 停止处理器
        if let Ok(processor) = self.unified_processor.lock() {
            processor.stop();
        }

        // 注意：由于我们不再存储 stream，音频流会在 start_recording 作用域结束时自动停止

        // 处理剩余的音频数据
        self.finalize_recording()?;

        self.emit_event("recording_completed", serde_json::json!({}));
        Ok(())
    }

    pub fn get_current_transcript(&self) -> Result<String, String> {
        let result_manager = self.result_manager.lock()
            .map_err(|e| format!("Failed to lock result manager: {}", e))?;
        
        Ok(result_manager.get_continuous_text(None))
    }

    pub fn get_segments(&self) -> Result<Vec<ManagedTranscriptSegment>, String> {
        let result_manager = self.result_manager.lock()
            .map_err(|e| format!("Failed to lock result manager: {}", e))?;
        
        Ok(result_manager.get_all_segments().iter().cloned().collect())
    }

    pub fn update_segment(&mut self, segment_id: &str, new_text: &str) -> Result<bool, String> {
        let mut result_manager = self.result_manager.lock()
            .map_err(|e| format!("Failed to lock result manager: {}", e))?;
        
        let success = result_manager.update_segment_text(segment_id, new_text.to_string());
        
        if success {
            self.emit_event("segment_updated", serde_json::json!({
                "segment_id": segment_id,
                "new_text": new_text
            }));
        }
        
        Ok(success)
    }

    fn start_audio_level_thread(&self, level_rx: mpsc::Receiver<AudioLevelEvent>) {
        let app_handle = self.app_handle.clone();
        
        thread::spawn(move || {
            while let Ok(level_event) = level_rx.recv() {
                let _ = app_handle.emit("audio_level_update", level_event);
            }
        });
    }

    fn start_main_processing_thread(&self, audio_rx: mpsc::Receiver<Vec<f32>>) {
        let is_recording = self.is_recording.clone();
        let audio_pipeline = self.audio_pipeline.clone();
        let unified_processor = self.unified_processor.clone();
        let context_processor = self.context_processor.clone();
        let result_manager = self.result_manager.clone();
        let segments_processed = self.segments_processed.clone();
        let app_handle = self.app_handle.clone();
        let config = self.config_settings.clone();

        thread::spawn(move || {
            let rt = tokio::runtime::Runtime::new().unwrap();
            
            while *is_recording.lock().unwrap() {
                match audio_rx.recv_timeout(Duration::from_millis(100)) {
                    Ok(audio_chunk) => {
                        rt.block_on(async {
                            Self::process_audio_chunk(
                                &audio_chunk,
                                &audio_pipeline,
                                &unified_processor,
                                &context_processor,
                                &result_manager,
                                &segments_processed,
                                &app_handle,
                                &config,
                            ).await;
                        });
                    }
                    Err(mpsc::RecvTimeoutError::Timeout) => {
                        // 清理超时的待处理结果
                        if let Ok(mut rm) = result_manager.try_lock() {
                            rm.cleanup_old_pending(Duration::from_secs(10));
                        }
                    }
                    Err(mpsc::RecvTimeoutError::Disconnected) => break,
                }
            }
        });
    }

    async fn process_audio_chunk(
        audio_chunk: &[f32],
        audio_pipeline: &Arc<Mutex<AudioProcessingPipeline>>,
        unified_processor: &Arc<Mutex<UnifiedProcessor>>,
        context_processor: &Arc<Mutex<ContextAwareProcessor>>,
        result_manager: &Arc<Mutex<ResultManager>>,
        segments_processed: &Arc<Mutex<u32>>,
        app_handle: &AppHandle,
        config: &OptimalRealtimeConfig,
    ) {
        // 1. 音频处理和分段
        let completed_segments = {
            let mut pipeline = audio_pipeline.lock().unwrap();
            pipeline.process_chunk(audio_chunk)
        };

        // 2. 处理完成的语音段
        for segment in completed_segments {
            Self::process_speech_segment(
                segment,
                unified_processor,
                context_processor,
                result_manager,
                segments_processed,
                app_handle,
                config,
            ).await;
        }
    }

    async fn process_speech_segment(
        segment: SpeechSegment,
        unified_processor: &Arc<Mutex<UnifiedProcessor>>,
        context_processor: &Arc<Mutex<ContextAwareProcessor>>,
        result_manager: &Arc<Mutex<ResultManager>>,
        segments_processed: &Arc<Mutex<u32>>,
        app_handle: &AppHandle,
        config: &OptimalRealtimeConfig,
    ) {
        // 1. 多层次处理
        let processing_events = {
            let mut processor = unified_processor.lock().unwrap();
            processor.process_segment(segment.clone()).await
        };

        // 2. 处理每个事件
        for event in processing_events {
            match event {
                ProcessingEvent::TemporaryResult(result) => {
                    // 上下文增强
                    let enhanced_result = if config.enable_context_awareness {
                        let mut ctx_processor = context_processor.lock().unwrap();
                        ctx_processor.process_with_context(result, &segment.audio_data)
                    } else {
                        result
                    };

                    // 发送临时结果到前端
                    let event_data = TranscriptionResultEvent {
                        segment_id: enhanced_result.segment_id.clone(),
                        text: enhanced_result.text.clone(),
                        confidence: enhanced_result.confidence,
                        is_temporary: true,
                        speaker: enhanced_result.speaker.clone(),
                        timestamp: enhanced_result.timestamp,
                        processing_time_ms: enhanced_result.processing_time_ms,
                    };

                    let _ = app_handle.emit("transcription_result", event_data);

                    // 添加到结果管理器
                    let _ = {
                        let mut rm = result_manager.lock().unwrap();
                        rm.process_result(enhanced_result)
                    };
                }
                ProcessingEvent::FinalResult(result) => {
                    // 上下文增强
                    let enhanced_result = if config.enable_context_awareness {
                        let mut ctx_processor = context_processor.lock().unwrap();
                        ctx_processor.process_with_context(result, &segment.audio_data)
                    } else {
                        result
                    };

                    // 结果管理和去重
                    let updated_segments = {
                        let mut rm = result_manager.lock().unwrap();
                        rm.process_result(enhanced_result.clone())
                    };

                    // 发送最终结果到前端
                    let event_data = TranscriptionResultEvent {
                        segment_id: enhanced_result.segment_id.clone(),
                        text: enhanced_result.text.clone(),
                        confidence: enhanced_result.confidence,
                        is_temporary: false,
                        speaker: enhanced_result.speaker.clone(),
                        timestamp: enhanced_result.timestamp,
                        processing_time_ms: enhanced_result.processing_time_ms,
                    };

                    let _ = app_handle.emit("transcription_result", event_data);

                    // 通知段落更新
                    for segment_id in updated_segments {
                        let _ = app_handle.emit("segment_updated", serde_json::json!({
                            "segment_id": segment_id
                        }));
                    }

                    // 更新统计
                    *segments_processed.lock().unwrap() += 1;
                }
                ProcessingEvent::ProcessingStats { .. } => {
                    // 处理统计事件
                }
            }
        }
    }

    fn start_stats_thread(&self) {
        let is_recording = self.is_recording.clone();
        let result_manager = self.result_manager.clone();
        let context_processor = self.context_processor.clone();
        let segments_processed = self.segments_processed.clone();
        let app_handle = self.app_handle.clone();

        thread::spawn(move || {
            while *is_recording.lock().unwrap() {
                thread::sleep(Duration::from_secs(5)); // 每5秒报告一次

                if let (Ok(rm), Ok(ctx)) = (result_manager.try_lock(), context_processor.try_lock()) {
                    let quality_report = rm.get_quality_report();
                    let speaker_count = ctx.get_speaker_count();
                    let processed = *segments_processed.lock().unwrap();

                    let stats_event = ProcessingStatsEvent {
                        segments_processed: processed,
                        avg_processing_time: 0, // TODO: 从unified_processor获取
                        quality_report,
                        speaker_count,
                        buffer_usage: 0.0, // TODO: 计算缓冲区使用率
                    };

                    let _ = app_handle.emit("processing_stats", stats_event);
                }
            }
        });
    }

    fn finalize_recording(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        // 处理剩余的音频数据
        if let Ok(mut pipeline) = self.audio_pipeline.lock() {
            if let Some(final_segment) = pipeline.force_complete_current() {
                // TODO: 异步处理最后的段落
                println!("Processing final segment: {:.2}s", final_segment.length_seconds());
            }
        }

        // 生成最终报告
        if let Ok(rm) = self.result_manager.lock() {
            let quality_report = rm.get_quality_report();
            self.emit_event("final_quality_report", serde_json::to_value(quality_report).unwrap());
        }

        Ok(())
    }

    fn emit_event(&self, event_type: &str, data: serde_json::Value) {
        let event = RealtimeTranscriptionEvent {
            event_type: event_type.to_string(),
            data,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
        };

        let _ = self.app_handle.emit("realtime_transcription_event", event);
    }

    pub fn get_recording_duration(&self) -> u64 {
        if let Some(start_time) = self.start_time {
            start_time.elapsed().as_secs()
        } else {
            0
        }
    }
}

// Tauri状态管理
use std::sync::Mutex as StdMutex;

pub struct OptimalRealtimeState(StdMutex<Option<OptimalRealtimeProcessor>>);

impl OptimalRealtimeState {
    pub fn new() -> Self {
        OptimalRealtimeState(StdMutex::new(None))
    }
}

impl Default for OptimalRealtimeState {
    fn default() -> Self {
        Self::new()
    }
}

// Tauri命令接口
use tauri::State;

#[tauri::command]
pub async fn start_optimal_realtime_recording(
    app_handle: AppHandle,
    config: OptimalRealtimeConfig,
    whisper_state: State<'_, WhisperContextState>,
    state: State<'_, OptimalRealtimeState>,
) -> Result<(), String> {
    let mut processor_state = state.0.lock().map_err(|e| e.to_string())?;
    
    match OptimalRealtimeProcessor::new(app_handle, config, &*whisper_state) {
        Ok(mut processor) => {
            processor.start_recording().map_err(|e| e.to_string())?;
            *processor_state = Some(processor);
            Ok(())
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn pause_optimal_realtime_recording(
    state: State<'_, OptimalRealtimeState>,
) -> Result<(), String> {
    let mut processor_state = state.0.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref mut processor) = processor_state.as_mut() {
        processor.pause_recording().map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn resume_optimal_realtime_recording(
    state: State<'_, OptimalRealtimeState>,
) -> Result<(), String> {
    let mut processor_state = state.0.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref mut processor) = processor_state.as_mut() {
        processor.resume_recording().map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn stop_optimal_realtime_recording(
    state: State<'_, OptimalRealtimeState>,
) -> Result<(), String> {
    let mut processor_state = state.0.lock().map_err(|e| e.to_string())?;
    
    if let Some(mut processor) = processor_state.take() {
        processor.stop_recording().map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn get_optimal_current_transcript(
    state: State<'_, OptimalRealtimeState>,
) -> Result<String, String> {
    let processor_state = state.0.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref processor) = processor_state.as_ref() {
        processor.get_current_transcript()
    } else {
        Ok(String::new())
    }
}

#[tauri::command]
pub async fn get_optimal_segments(
    state: State<'_, OptimalRealtimeState>,
) -> Result<Vec<ManagedTranscriptSegment>, String> {
    let processor_state = state.0.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref processor) = processor_state.as_ref() {
        processor.get_segments()
    } else {
        Ok(Vec::new())
    }
}

#[tauri::command]
pub async fn update_optimal_segment(
    segment_id: String,
    new_text: String,
    state: State<'_, OptimalRealtimeState>,
) -> Result<bool, String> {
    let mut processor_state = state.0.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref mut processor) = processor_state.as_mut() {
        processor.update_segment(&segment_id, &new_text)
    } else {
        Err("No active processor".to_string())
    }
}

#[tauri::command]
pub async fn get_optimal_recording_duration(
    state: State<'_, OptimalRealtimeState>,
) -> Result<u64, String> {
    let processor_state = state.0.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref processor) = processor_state.as_ref() {
        Ok(processor.get_recording_duration())
    } else {
        Ok(0)
    }
}