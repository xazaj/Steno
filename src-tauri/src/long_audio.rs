use std::sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}};
use std::collections::HashMap;
use tokio::task::JoinHandle;
use tokio::sync::{mpsc, RwLock};
use serde::{Serialize, Deserialize};
use tauri::{Emitter, WebviewWindow};
use crate::storage::TranscriptionSegment;

// 音频段信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioSegment {
    pub id: String,
    pub start_time: f64,    // 在原音频中的开始时间（秒）
    pub end_time: f64,      // 在原音频中的结束时间（秒）
    pub duration: f64,      // 段长度（秒）
    pub sample_start: usize, // 在采样数组中的开始位置
    pub sample_end: usize,   // 在采样数组中的结束位置
    pub status: SegmentStatus,
    pub text: Option<String>,
    pub confidence: Option<f64>,
    pub processing_time: Option<f64>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SegmentStatus {
    Pending,     // 等待处理
    Processing,  // 正在处理
    Completed,   // 处理完成
    Failed,      // 处理失败
}

// 长音频处理任务
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LongAudioTask {
    pub id: String,
    pub record_id: String,  // 关联的转录记录ID
    pub file_path: String,
    pub total_duration: f64,
    pub total_segments: usize,
    pub completed_segments: usize,
    pub failed_segments: usize,
    pub status: TaskStatus,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub segments: Vec<AudioSegment>,
    pub final_text: Option<String>,
    pub processing_stats: ProcessingStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TaskStatus {
    Preparing,   // 预处理阶段
    Processing,  // 正在处理
    Paused,      // 已暂停
    Completed,   // 已完成
    Failed,      // 失败
    Cancelled,   // 已取消
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingStats {
    pub average_processing_speed: f64,  // 平均处理速度 (倍速)
    pub estimated_remaining_time: Option<f64>, // 预计剩余时间（秒）
    pub active_workers: usize,          // 活跃工作线程数
    pub memory_usage_mb: f64,           // 内存使用量（MB）
    pub accuracy_estimate: Option<f64>, // 准确率估计
}

// 工作线程状态
#[derive(Debug)]
struct WorkerState {
    id: usize,
    is_busy: Arc<AtomicBool>,
    current_segment: Arc<Mutex<Option<String>>>,
    handle: Option<JoinHandle<()>>,
}

// 长音频处理器
pub struct LongAudioProcessor {
    tasks: Arc<RwLock<HashMap<String, LongAudioTask>>>,
    workers: Arc<Mutex<Vec<WorkerState>>>,
    max_workers: usize,
    should_stop: Arc<AtomicBool>,
    segment_tx: mpsc::UnboundedSender<ProcessingMessage>,
    segment_rx: Arc<Mutex<mpsc::UnboundedReceiver<ProcessingMessage>>>,
}

#[derive(Debug)]
enum ProcessingMessage {
    ProcessSegment {
        task_id: String,
        segment_id: String,
        audio_data: Vec<f32>,
        config: ProcessingConfig,
    },
    SegmentCompleted {
        task_id: String,
        segment_id: String,
        result: SegmentResult,
    },
    SegmentFailed {
        task_id: String,
        segment_id: String,
        error: String,
    },
    TaskPaused(String),
    TaskResumed(String),
    TaskCancelled(String),
}

#[derive(Debug, Clone)]
pub struct ProcessingConfig {
    pub language: String,
    pub model_mode: String,
    pub audio_enhancement: bool,
    pub segment_overlap: f64,  // 段间重叠时间（秒）
    pub max_segment_length: f64, // 最大段长度（秒）
    pub min_segment_length: f64, // 最小段长度（秒）
    pub initial_prompt: Option<String>,
}

#[derive(Debug, Clone)]
struct SegmentResult {
    text: String,
    confidence: f64,
    processing_time: f64,
    word_segments: Option<Vec<TranscriptionSegment>>,
}

impl Default for ProcessingConfig {
    fn default() -> Self {
        Self {
            language: "auto".to_string(),
            model_mode: "normal".to_string(),
            audio_enhancement: true,
            segment_overlap: 1.0,      // 1秒重叠
            max_segment_length: 60.0,  // 最大60秒
            min_segment_length: 10.0,  // 最小10秒
            initial_prompt: None,
        }
    }
}

impl Default for ProcessingStats {
    fn default() -> Self {
        Self {
            average_processing_speed: 0.0,
            estimated_remaining_time: None,
            active_workers: 0,
            memory_usage_mb: 0.0,
            accuracy_estimate: None,
        }
    }
}

impl LongAudioProcessor {
    pub fn new() -> Self {
        let cpu_count = num_cpus::get();
        let max_workers = (cpu_count.saturating_sub(1)).max(1).min(8); // 保留一个核心给UI，最多8个工作线程
        
        let (segment_tx, segment_rx) = mpsc::unbounded_channel();
        
        Self {
            tasks: Arc::new(RwLock::new(HashMap::new())),
            workers: Arc::new(Mutex::new(Vec::new())),
            max_workers,
            should_stop: Arc::new(AtomicBool::new(false)),
            segment_tx,
            segment_rx: Arc::new(Mutex::new(segment_rx)),
        }
    }

    // 创建长音频处理任务
    pub async fn create_task(
        &self, 
        record_id: String, 
        file_path: String,
        config: ProcessingConfig,
        window: &WebviewWindow
    ) -> Result<String, String> {
        let task_id = format!("long_audio_{}", chrono::Utc::now().timestamp_millis());
        
        // 发送预处理开始事件
        let _ = window.emit("long_audio_preprocessing", &serde_json::json!({
            "task_id": task_id,
            "stage": "loading",
            "message": "正在加载音频文件..."
        }));

        // 加载和预处理音频
        let (audio_data, sample_rate, total_duration) = self.load_audio_file(&file_path).await?;
        
        let _ = window.emit("long_audio_preprocessing", &serde_json::json!({
            "task_id": task_id,
            "stage": "segmenting",
            "message": "正在进行智能分段..."
        }));

        // 智能分段
        let segments = self.segment_audio(&audio_data, sample_rate, total_duration, &config).await?;
        
        let task = LongAudioTask {
            id: task_id.clone(),
            record_id,
            file_path,
            total_duration,
            total_segments: segments.len(),
            completed_segments: 0,
            failed_segments: 0,
            status: TaskStatus::Preparing,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            segments,
            final_text: None,
            processing_stats: ProcessingStats::default(),
        };

        // 保存任务
        {
            let mut tasks = self.tasks.write().await;
            tasks.insert(task_id.clone(), task.clone());
        }

        let _ = window.emit("long_audio_task_created", &serde_json::json!({
            "task_id": task_id,
            "total_segments": task.total_segments,
            "total_duration": total_duration,
            "message": "任务创建完成，准备开始处理"
        }));

        Ok(task_id)
    }

    // 开始处理任务
    pub async fn start_task(&self, task_id: String, window: WebviewWindow) -> Result<(), String> {
        // 更新任务状态
        {
            let mut tasks = self.tasks.write().await;
            if let Some(task) = tasks.get_mut(&task_id) {
                task.status = TaskStatus::Processing;
                task.updated_at = chrono::Utc::now();
            } else {
                return Err("任务不存在".to_string());
            }
        }

        // 启动工作线程
        self.start_workers().await;

        // 开始分发处理任务
        self.dispatch_segments(task_id.clone(), window).await?;

        Ok(())
    }

    // 暂停任务
    pub async fn pause_task(&self, task_id: String) -> Result<(), String> {
        {
            let mut tasks = self.tasks.write().await;
            if let Some(task) = tasks.get_mut(&task_id) {
                task.status = TaskStatus::Paused;
                task.updated_at = chrono::Utc::now();
            } else {
                return Err("任务不存在".to_string());
            }
        }

        let _ = self.segment_tx.send(ProcessingMessage::TaskPaused(task_id));
        Ok(())
    }

    // 恢复任务
    pub async fn resume_task(&self, task_id: String, window: WebviewWindow) -> Result<(), String> {
        {
            let mut tasks = self.tasks.write().await;
            if let Some(task) = tasks.get_mut(&task_id) {
                task.status = TaskStatus::Processing;
                task.updated_at = chrono::Utc::now();
            } else {
                return Err("任务不存在".to_string());
            }
        }

        let _ = self.segment_tx.send(ProcessingMessage::TaskResumed(task_id.clone()));
        self.dispatch_segments(task_id, window).await?;
        Ok(())
    }

    // 取消任务
    pub async fn cancel_task(&self, task_id: String) -> Result<(), String> {
        {
            let mut tasks = self.tasks.write().await;
            if let Some(task) = tasks.get_mut(&task_id) {
                task.status = TaskStatus::Cancelled;
                task.updated_at = chrono::Utc::now();
            } else {
                return Err("任务不存在".to_string());
            }
        }

        let _ = self.segment_tx.send(ProcessingMessage::TaskCancelled(task_id));
        Ok(())
    }

    // 获取任务状态
    pub async fn get_task(&self, task_id: &str) -> Option<LongAudioTask> {
        let tasks = self.tasks.read().await;
        tasks.get(task_id).cloned()
    }

    // 获取所有任务
    pub async fn get_all_tasks(&self) -> Vec<LongAudioTask> {
        let tasks = self.tasks.read().await;
        tasks.values().cloned().collect()
    }

    // 私有方法：加载音频文件
    async fn load_audio_file(&self, file_path: &str) -> Result<(Vec<f32>, u32, f64), String> {
        // 这里复用现有的音频加载逻辑
        // 返回: (音频数据, 采样率, 总时长)
        tokio::task::spawn_blocking({
            let file_path = file_path.to_string();
            move || {
                crate::load_and_convert_audio(&file_path)
                    .map_err(|e| format!("加载音频文件失败: {}", e))
            }
        }).await
        .map_err(|e| format!("异步任务失败: {}", e))?
    }

    // 私有方法：智能分段
    async fn segment_audio(
        &self, 
        audio_data: &[f32], 
        sample_rate: u32, 
        _total_duration: f64,
        config: &ProcessingConfig
    ) -> Result<Vec<AudioSegment>, String> {
        let mut segments = Vec::new();
        let samples_per_second = sample_rate as f64;
        let max_segment_samples = (config.max_segment_length * samples_per_second) as usize;
        let min_segment_samples = (config.min_segment_length * samples_per_second) as usize;
        let overlap_samples = (config.segment_overlap * samples_per_second) as usize;

        // 使用VAD检测语音活动区域
        let speech_segments = self.detect_speech_segments(audio_data, sample_rate).await?;
        
        let mut segment_id = 0;
        for (speech_start, speech_end) in speech_segments {
            let mut current_start = speech_start;
            
            while current_start < speech_end {
                let mut segment_end = (current_start + max_segment_samples).min(speech_end);
                
                // 在最后overlap_samples范围内寻找最佳切割点（低能量点）
                if segment_end < speech_end {
                    let search_start = segment_end.saturating_sub(overlap_samples);
                    if let Some(best_cut) = self.find_best_cut_point(audio_data, search_start, segment_end) {
                        segment_end = best_cut;
                    }
                }

                // 确保段长度满足最小要求
                if segment_end - current_start >= min_segment_samples {
                    let start_time = current_start as f64 / samples_per_second;
                    let end_time = segment_end as f64 / samples_per_second;
                    
                    segments.push(AudioSegment {
                        id: format!("segment_{}", segment_id),
                        start_time,
                        end_time,
                        duration: end_time - start_time,
                        sample_start: current_start,
                        sample_end: segment_end,
                        status: SegmentStatus::Pending,
                        text: None,
                        confidence: None,
                        processing_time: None,
                        error: None,
                    });
                    
                    segment_id += 1;
                }

                current_start = segment_end.saturating_sub(overlap_samples);
            }
        }

        if segments.is_empty() {
            return Err("未检测到有效的语音段".to_string());
        }

        Ok(segments)
    }

    // 私有方法：检测语音段
    async fn detect_speech_segments(&self, audio_data: &[f32], _sample_rate: u32) -> Result<Vec<(usize, usize)>, String> {
        // 复用现有的VAD逻辑
        tokio::task::spawn_blocking({
            let audio_data = audio_data.to_vec();
            move || {
                crate::detect_speech_segments(&audio_data)
                    .map_err(|e| format!("语音活动检测失败: {}", e))
            }
        }).await
        .map_err(|e| format!("异步任务失败: {}", e))?
    }

    // 私有方法：寻找最佳切割点
    fn find_best_cut_point(&self, audio_data: &[f32], start: usize, end: usize) -> Option<usize> {
        let mut min_energy = f32::MAX;
        let mut best_point = None;
        
        for i in start..end {
            if i + 1600 < audio_data.len() { // 检查100ms的能量窗口
                let energy: f32 = audio_data[i..i+1600].iter().map(|x| x * x).sum();
                if energy < min_energy {
                    min_energy = energy;
                    best_point = Some(i);
                }
            }
        }
        
        best_point
    }

    // 私有方法：启动工作线程
    async fn start_workers(&self) {
        let worker_count = {
            let mut workers = self.workers.lock().unwrap();
            
            // 清理已完成的工作线程
            workers.retain(|worker| {
                if let Some(ref handle) = worker.handle {
                    !handle.is_finished()
                } else {
                    false
                }
            });
            
            workers.len()
        };

        // 启动新的工作线程直到达到最大数量
        for worker_id in worker_count..self.max_workers {
            let is_busy = Arc::new(AtomicBool::new(false));
            let current_segment = Arc::new(Mutex::new(None));
            
            let handle = self.spawn_worker(worker_id, is_busy.clone(), current_segment.clone()).await;
            
            let mut workers = self.workers.lock().unwrap();
            workers.push(WorkerState {
                id: worker_id,
                is_busy,
                current_segment,
                handle: Some(handle),
            });
        }
    }

    // 私有方法：创建工作线程
    async fn spawn_worker(
        &self,
        worker_id: usize,
        is_busy: Arc<AtomicBool>,
        current_segment: Arc<Mutex<Option<String>>>,
    ) -> JoinHandle<()> {
        let segment_rx = self.segment_rx.clone();
        let segment_tx = self.segment_tx.clone();
        let should_stop = self.should_stop.clone();

        tokio::spawn(async move {
            println!("工作线程 {} 启动", worker_id);
            
            while !should_stop.load(Ordering::Relaxed) {
                // 尝试获取处理消息
                let message = {
                    let mut rx = segment_rx.lock().unwrap();
                    rx.try_recv().ok()
                };
                
                if let Some(msg) = message {
                    match msg {
                        ProcessingMessage::ProcessSegment { task_id, segment_id, audio_data, config } => {
                            is_busy.store(true, Ordering::Relaxed);
                            {
                                let mut current = current_segment.lock().unwrap();
                                *current = Some(segment_id.clone());
                            }
                            
                            println!("工作线程 {} 开始处理段 {}", worker_id, segment_id);
                            
                            // 处理音频段
                            match Self::process_audio_segment(&audio_data, &config).await {
                                Ok(result) => {
                                    let _ = segment_tx.send(ProcessingMessage::SegmentCompleted {
                                        task_id,
                                        segment_id,
                                        result,
                                    });
                                }
                                Err(error) => {
                                    let _ = segment_tx.send(ProcessingMessage::SegmentFailed {
                                        task_id,
                                        segment_id,
                                        error,
                                    });
                                }
                            }
                            
                            is_busy.store(false, Ordering::Relaxed);
                            {
                                let mut current = current_segment.lock().unwrap();
                                *current = None;
                            }
                        }
                        ProcessingMessage::TaskPaused(_) | 
                        ProcessingMessage::TaskCancelled(_) => {
                            // 暂停或取消时，工作线程暂时停止处理
                            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                        }
                        _ => {}
                    }
                } else {
                    // 没有任务时短暂休眠
                    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
                }
            }
            
            println!("工作线程 {} 停止", worker_id);
        })
    }

    // 私有方法：处理单个音频段
    async fn process_audio_segment(
        audio_data: &[f32],
        config: &ProcessingConfig,
    ) -> Result<SegmentResult, String> {
        let start_time = std::time::Instant::now();
        
        // 这里调用现有的Whisper识别逻辑
        // 需要创建一个简化版本，只处理单个音频段
        tokio::task::spawn_blocking({
            let audio_data = audio_data.to_vec();
            let config = config.clone();
            move || {
                // 调用Whisper处理
                // 这里需要实现单段处理逻辑
                Self::whisper_process_segment(&audio_data, &config)
            }
        }).await
        .map_err(|e| format!("处理任务失败: {}", e))?
        .map(|text| {
            let processing_time = start_time.elapsed().as_secs_f64();
            SegmentResult {
                text,
                confidence: 0.85, // 临时值，实际应从Whisper获取
                processing_time,
                word_segments: None, // 可以后续添加词级别时间戳
            }
        })
    }

    // 私有方法：Whisper段处理（需要实现）
    fn whisper_process_segment(audio_data: &[f32], config: &ProcessingConfig) -> Result<String, String> {
        // 这里需要传入Whisper context，暂时返回模拟结果
        // TODO: 需要重构以支持多线程Whisper处理
        let segment_duration = audio_data.len() as f64 / 16000.0;
        
        // 模拟处理时间（实际会更快）
        std::thread::sleep(std::time::Duration::from_millis((segment_duration * 100.0) as u64));
        
        // 根据配置生成模拟文本
        let mock_text = match config.language.as_str() {
            "zh" => format!("这是一个时长 {:.1} 秒的中文音频段的转录结果。内容包含了会议讨论、项目计划和技术方案的介绍。", segment_duration),
            "en" => format!("This is a transcription result for an audio segment of {:.1} seconds duration. The content includes meeting discussions, project planning and technical solution presentations.", segment_duration),
            _ => format!("Audio segment transcription result ({:.1}s): Meeting content with discussions about project planning and implementation details.", segment_duration),
        };
        
        Ok(mock_text)
    }

    // 私有方法：分发处理任务
    async fn dispatch_segments(&self, task_id: String, window: WebviewWindow) -> Result<(), String> {
        let segments_to_process: Vec<AudioSegment> = {
            let tasks = self.tasks.read().await;
            if let Some(task) = tasks.get(&task_id) {
                task.segments.iter()
                    .filter(|s| matches!(s.status, SegmentStatus::Pending))
                    .cloned()
                    .collect()
            } else {
                return Err("任务不存在".to_string());
            }
        };

        // 加载完整音频数据用于分段
        let (full_audio_data, _, _) = {
            let tasks = self.tasks.read().await;
            if let Some(task) = tasks.get(&task_id) {
                self.load_audio_file(&task.file_path).await?
            } else {
                return Err("任务不存在".to_string());
            }
        };

        // 分发处理任务
        for segment in segments_to_process {
            let segment_audio = full_audio_data[segment.sample_start..segment.sample_end].to_vec();
            let config = ProcessingConfig::default(); // 应该从任务配置获取
            
            let _ = self.segment_tx.send(ProcessingMessage::ProcessSegment {
                task_id: task_id.clone(),
                segment_id: segment.id.clone(),
                audio_data: segment_audio,
                config,
            });
        }

        // 启动结果监听器
        self.start_result_listener(task_id, window).await;
        
        Ok(())
    }

    // 私有方法：启动结果监听器
    async fn start_result_listener(&self, task_id: String, window: WebviewWindow) {
        let tasks = self.tasks.clone();
        let segment_rx = self.segment_rx.clone();
        
        tokio::spawn(async move {
            loop {
                let message = {
                    let mut rx = segment_rx.lock().unwrap();
                    // 使用try_recv避免长时间持有锁
                    rx.try_recv().ok()
                };
                
                if message.is_none() {
                    // 没有消息时短暂休眠
                    tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
                    continue;
                }
                
                if let Some(msg) = message {
                    match msg {
                        ProcessingMessage::SegmentCompleted { task_id: msg_task_id, segment_id, result } => {
                            if msg_task_id == task_id {
                                // 更新任务状态
                                {
                                    let mut tasks_guard = tasks.write().await;
                                    if let Some(task) = tasks_guard.get_mut(&task_id) {
                                        if let Some(segment) = task.segments.iter_mut().find(|s| s.id == segment_id) {
                                            segment.status = SegmentStatus::Completed;
                                            segment.text = Some(result.text.clone());
                                            segment.confidence = Some(result.confidence);
                                            segment.processing_time = Some(result.processing_time);
                                        }
                                        task.completed_segments += 1;
                                        task.updated_at = chrono::Utc::now();
                                        
                                        // 更新处理统计
                                        task.processing_stats.active_workers = task.segments.iter()
                                            .filter(|s| matches!(s.status, SegmentStatus::Processing))
                                            .count();
                                        
                                        // 计算平均处理速度
                                        let completed_segments: Vec<_> = task.segments.iter()
                                            .filter(|s| matches!(s.status, SegmentStatus::Completed))
                                            .collect();
                                        
                                        if !completed_segments.is_empty() {
                                            let total_audio_time: f64 = completed_segments.iter()
                                                .map(|s| s.duration)
                                                .sum();
                                            let total_processing_time: f64 = completed_segments.iter()
                                                .filter_map(|s| s.processing_time)
                                                .sum();
                                            
                                            if total_processing_time > 0.0 {
                                                task.processing_stats.average_processing_speed = total_audio_time / total_processing_time;
                                            }
                                            
                                            // 估算剩余时间
                                            let remaining_segments = task.total_segments - task.completed_segments;
                                            if remaining_segments > 0 && task.processing_stats.average_processing_speed > 0.0 {
                                                let remaining_audio_time: f64 = task.segments.iter()
                                                    .filter(|s| matches!(s.status, SegmentStatus::Pending | SegmentStatus::Processing))
                                                    .map(|s| s.duration)
                                                    .sum();
                                                task.processing_stats.estimated_remaining_time = Some(
                                                    remaining_audio_time / task.processing_stats.average_processing_speed
                                                );
                                            }
                                        }
                                    }
                                }
                                
                                // 发送进度更新事件
                                let progress_data = {
                                    let tasks_guard = tasks.read().await;
                                    if let Some(task) = tasks_guard.get(&task_id) {
                                        serde_json::json!({
                                            "task_id": task_id,
                                            "completed_segments": task.completed_segments,
                                            "total_segments": task.total_segments,
                                            "progress": (task.completed_segments as f64 / task.total_segments as f64 * 100.0),
                                            "segment_id": segment_id,
                                            "segment_text": result.text,
                                            "processing_stats": task.processing_stats
                                        })
                                    } else {
                                        continue;
                                    }
                                };
                                
                                let _ = window.emit("long_audio_segment_completed", &progress_data);
                                
                                // 检查是否所有段都已完成
                                let is_task_completed = {
                                    let tasks_guard = tasks.read().await;
                                    if let Some(task) = tasks_guard.get(&task_id) {
                                        task.completed_segments == task.total_segments
                                    } else {
                                        false
                                    }
                                };
                                
                                if is_task_completed {
                                    // 合并所有段的文本
                                    let final_text = {
                                        let mut tasks_guard = tasks.write().await;
                                        if let Some(task) = tasks_guard.get_mut(&task_id) {
                                            task.status = TaskStatus::Completed;
                                            task.updated_at = chrono::Utc::now();
                                            
                                            let mut combined_text = String::new();
                                            for segment in &task.segments {
                                                if let Some(text) = &segment.text {
                                                    if !combined_text.is_empty() {
                                                        combined_text.push(' ');
                                                    }
                                                    combined_text.push_str(text);
                                                }
                                            }
                                            task.final_text = Some(combined_text.clone());
                                            combined_text
                                        } else {
                                            String::new()
                                        }
                                    };
                                    
                                    let _ = window.emit("long_audio_task_completed", &serde_json::json!({
                                        "task_id": task_id,
                                        "final_text": final_text,
                                        "message": "长音频转录完成！"
                                    }));
                                    
                                    break; // 任务完成，退出监听循环
                                }
                            }
                        }
                        ProcessingMessage::SegmentFailed { task_id: msg_task_id, segment_id, error } => {
                            if msg_task_id == task_id {
                                // 更新失败段状态
                                {
                                    let mut tasks_guard = tasks.write().await;
                                    if let Some(task) = tasks_guard.get_mut(&task_id) {
                                        if let Some(segment) = task.segments.iter_mut().find(|s| s.id == segment_id) {
                                            segment.status = SegmentStatus::Failed;
                                            segment.error = Some(error.clone());
                                        }
                                        task.failed_segments += 1;
                                        task.updated_at = chrono::Utc::now();
                                    }
                                }
                                
                                let _ = window.emit("long_audio_segment_failed", &serde_json::json!({
                                    "task_id": task_id,
                                    "segment_id": segment_id,
                                    "error": error
                                }));
                            }
                        }
                        _ => {}
                    }
                } else {
                    break;
                }
            }
        });
    }
}

// 全局处理器实例
lazy_static::lazy_static! {
    pub static ref LONG_AUDIO_PROCESSOR: LongAudioProcessor = LongAudioProcessor::new();
}