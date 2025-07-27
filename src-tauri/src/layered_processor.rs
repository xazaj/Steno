// layered_processor.rs - 多层次处理器
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tokio::sync::mpsc;
use serde::{Deserialize, Serialize};

use crate::realtime_whisper::{RealtimeWhisperRecognizer, RealtimeRecognitionConfig};
use crate::whisper_context;
use crate::audio_processing::SpeechSegment;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptResult {
    pub text: String,
    pub confidence: f32,
    pub is_temporary: bool,
    pub speaker: Option<String>,
    pub timestamp: u64,
    pub processing_time_ms: u64,
    pub segment_id: String,
}

#[derive(Debug, Clone)]
pub enum ProcessingChannel {
    Fast,
    Accurate,
}

/// 快速处理器 - 用于实时反馈
pub struct FastProcessor {
    recognizer: RealtimeWhisperRecognizer,
    max_processing_time: Duration,
}

impl FastProcessor {
    pub fn new(whisper_ctx: *mut std::ffi::c_void, language: String, initial_prompt: Option<String>) -> Result<Self, String> {
        let config = RealtimeRecognitionConfig {
            language,
            mode: "fast".to_string(),
            speaker_diarization: false,
            noise_reduction: false,
            beam_size: 1, // 最小beam size
            temperature: 0.2, // 稍高温度，更快但略不稳定
            max_tokens: 20, // 限制token数
            initial_prompt, // 使用传入的提示词
        };

        let recognizer = RealtimeWhisperRecognizer::new(whisper_ctx as *mut whisper_context, config);
        
        Ok(Self {
            recognizer,
            max_processing_time: Duration::from_millis(150),
        })
    }

    pub fn transcribe_draft(&self, segment: &SpeechSegment) -> Option<TranscriptResult> {
        // 只处理短音频片段
        if segment.length_seconds() > 2.0 {
            return None;
        }

        let start_time = Instant::now();
        
        match self.recognizer.process_audio_chunk(&segment.audio_data) {
            Ok(whisper_result) => {
                let processing_time = start_time.elapsed();
                
                // 如果处理时间过长，放弃结果
                if processing_time > self.max_processing_time {
                    return None;
                }

                Some(TranscriptResult {
                    text: whisper_result.text,
                    confidence: whisper_result.confidence * 0.8, // 快速结果置信度打折
                    is_temporary: true,
                    speaker: whisper_result.speaker,
                    timestamp: whisper_result.timestamp,
                    processing_time_ms: processing_time.as_millis() as u64,
                    segment_id: format!("fast_{}", whisper_result.timestamp),
                })
            }
            Err(_) => None,
        }
    }
}

/// 精确处理器 - 用于最终结果
pub struct AccurateProcessor {
    recognizer: RealtimeWhisperRecognizer,
}

impl AccurateProcessor {
    pub fn new(whisper_ctx: *mut std::ffi::c_void, language: String, initial_prompt: Option<String>) -> Result<Self, String> {
        let config = RealtimeRecognitionConfig {
            language,
            mode: "accurate".to_string(),
            speaker_diarization: true,
            noise_reduction: true,
            beam_size: 5, // 更大的beam size
            temperature: 0.0, // 最保守的温度
            max_tokens: 50, // 更多token
            initial_prompt, // 使用传入的提示词
        };

        let recognizer = RealtimeWhisperRecognizer::new(whisper_ctx as *mut whisper_context, config);
        
        Ok(Self {
            recognizer,
        })
    }

    pub async fn transcribe_accurate(&self, segment: &SpeechSegment) -> Option<TranscriptResult> {
        let start_time = Instant::now();
        
        // 为长音频使用分段处理
        let audio_chunks = if segment.length_seconds() > 5.0 {
            self.split_long_audio(&segment.audio_data)
        } else {
            vec![segment.audio_data.clone()]
        };

        let mut combined_text = String::new();
        let mut total_confidence = 0.0;
        let mut valid_chunks = 0;

        for chunk in audio_chunks {
            if let Ok(result) = self.recognizer.process_audio_chunk(&chunk) {
                combined_text.push_str(&result.text);
                combined_text.push(' ');
                total_confidence += result.confidence;
                valid_chunks += 1;
            }
        }

        if valid_chunks == 0 {
            return None;
        }

        let avg_confidence = total_confidence / valid_chunks as f32;
        let processing_time = start_time.elapsed();

        Some(TranscriptResult {
            text: combined_text.trim().to_string(),
            confidence: avg_confidence,
            is_temporary: false,
            speaker: None, // TODO: 实现说话人识别
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            processing_time_ms: processing_time.as_millis() as u64,
            segment_id: format!("accurate_{}", segment.start_time.elapsed().as_millis()),
        })
    }

    fn split_long_audio(&self, audio: &[f32]) -> Vec<Vec<f32>> {
        const CHUNK_SIZE: usize = 16000 * 3; // 3秒块
        const OVERLAP_SIZE: usize = 16000 / 4; // 0.25秒重叠
        
        let mut chunks = Vec::new();
        let mut start = 0;
        
        while start < audio.len() {
            let end = (start + CHUNK_SIZE).min(audio.len());
            chunks.push(audio[start..end].to_vec());
            
            if end >= audio.len() {
                break;
            }
            
            start = end - OVERLAP_SIZE;
        }
        
        chunks
    }
}

/// 处理任务
#[derive(Debug)]
pub struct ProcessingTask {
    pub segment: SpeechSegment,
    pub channel: ProcessingChannel,
    pub priority: u8, // 0-255，越小越高优先级
}

/// 多层次处理器
pub struct LayeredProcessor {
    fast_processor: Arc<FastProcessor>,
    accurate_processor: Arc<AccurateProcessor>,
    task_sender: mpsc::UnboundedSender<ProcessingTask>,
    result_receiver: Arc<Mutex<mpsc::UnboundedReceiver<TranscriptResult>>>,
    is_running: Arc<Mutex<bool>>,
}

impl LayeredProcessor {
    pub fn new(whisper_ctx: *mut std::ffi::c_void, language: String, initial_prompt: Option<String>) -> Result<Self, String> {
        let fast_processor = Arc::new(FastProcessor::new(whisper_ctx, language.clone(), initial_prompt.clone())?);
        let accurate_processor = Arc::new(AccurateProcessor::new(whisper_ctx, language, initial_prompt)?);
        
        let (task_sender, task_receiver) = mpsc::unbounded_channel();
        let (result_sender, result_receiver) = mpsc::unbounded_channel();
        
        let processor = Self {
            fast_processor: fast_processor.clone(),
            accurate_processor: accurate_processor.clone(),
            task_sender,
            result_receiver: Arc::new(Mutex::new(result_receiver)),
            is_running: Arc::new(Mutex::new(false)),
        };

        // 启动处理线程
        processor.start_processing_threads(task_receiver, result_sender);
        
        Ok(processor)
    }

    pub fn submit_fast_processing(&self, segment: SpeechSegment) -> Result<(), String> {
        let task = ProcessingTask {
            segment,
            channel: ProcessingChannel::Fast,
            priority: 0, // 最高优先级
        };
        
        self.task_sender.send(task)
            .map_err(|e| format!("Failed to submit fast processing task: {}", e))
    }

    pub fn submit_accurate_processing(&self, segment: SpeechSegment) -> Result<(), String> {
        let task = ProcessingTask {
            segment,
            channel: ProcessingChannel::Accurate,
            priority: 100, // 中等优先级
        };
        
        self.task_sender.send(task)
            .map_err(|e| format!("Failed to submit accurate processing task: {}", e))
    }

    pub fn get_result(&self) -> Option<TranscriptResult> {
        if let Ok(mut receiver) = self.result_receiver.try_lock() {
            receiver.try_recv().ok()
        } else {
            None
        }
    }

    pub fn start(&self) {
        *self.is_running.lock().unwrap() = true;
    }

    pub fn stop(&self) {
        *self.is_running.lock().unwrap() = false;
    }

    fn start_processing_threads(
        &self,
        task_receiver: mpsc::UnboundedReceiver<ProcessingTask>,
        result_sender: mpsc::UnboundedSender<TranscriptResult>,
    ) {
        let fast_processor = self.fast_processor.clone();
        let accurate_processor = self.accurate_processor.clone();
        let is_running = self.is_running.clone();

        // 使用Arc<Mutex>包装task_receiver以便在多个线程间共享
        let task_receiver = Arc::new(Mutex::new(task_receiver));

        // 快速处理线程
        let fast_sender = result_sender.clone();
        let fast_running = is_running.clone();
        let fast_receiver = task_receiver.clone();
        thread::spawn(move || {
            let _rt = tokio::runtime::Runtime::new().unwrap();
            
            while *fast_running.lock().unwrap() {
                if let Ok(mut receiver) = fast_receiver.try_lock() {
                    if let Ok(task) = receiver.try_recv() {
                        if let ProcessingChannel::Fast = task.channel {
                            if let Some(result) = fast_processor.transcribe_draft(&task.segment) {
                                let _ = fast_sender.send(result);
                            }
                        }
                    }
                }
                thread::sleep(Duration::from_millis(10));
            }
        });

        // 精确处理线程
        let accurate_sender = result_sender;
        let accurate_running = is_running;
        let accurate_receiver = task_receiver;
        thread::spawn(move || {
            let rt = tokio::runtime::Runtime::new().unwrap();
            
            while *accurate_running.lock().unwrap() {
                if let Ok(mut receiver) = accurate_receiver.try_lock() {
                    if let Ok(task) = receiver.try_recv() {
                        if let ProcessingChannel::Accurate = task.channel {
                            rt.block_on(async {
                                if let Some(result) = accurate_processor.transcribe_accurate(&task.segment).await {
                                    let _ = accurate_sender.send(result);
                                }
                            });
                        }
                    }
                }
                thread::sleep(Duration::from_millis(50));
            }
        });
    }
}

/// 处理结果事件
#[derive(Debug, Clone, Serialize)]
pub enum ProcessingEvent {
    TemporaryResult(TranscriptResult),
    FinalResult(TranscriptResult),
    ProcessingStats {
        fast_queue_size: usize,
        accurate_queue_size: usize,
        avg_fast_time_ms: u64,
        avg_accurate_time_ms: u64,
    },
}

/// 统一的处理接口
pub struct UnifiedProcessor {
    layered_processor: LayeredProcessor,
    stats: ProcessingStats,
}

#[derive(Debug, Default)]
struct ProcessingStats {
    fast_processing_times: Vec<u64>,
    accurate_processing_times: Vec<u64>,
    fast_queue_size: usize,
    accurate_queue_size: usize,
}

impl UnifiedProcessor {
    pub fn new(whisper_ctx: *mut std::ffi::c_void, language: String, initial_prompt: Option<String>) -> Result<Self, String> {
        let layered_processor = LayeredProcessor::new(whisper_ctx, language, initial_prompt)?;
        
        Ok(Self {
            layered_processor,
            stats: ProcessingStats::default(),
        })
    }

    pub async fn process_segment(&mut self, segment: SpeechSegment) -> Vec<ProcessingEvent> {
        let mut events = Vec::new();

        // 提交快速处理
        if segment.length_seconds() <= 2.0 {
            if let Err(e) = self.layered_processor.submit_fast_processing(segment.clone()) {
                eprintln!("Fast processing submission failed: {}", e);
            }
        }

        // 提交精确处理
        if let Err(e) = self.layered_processor.submit_accurate_processing(segment) {
            eprintln!("Accurate processing submission failed: {}", e);
        }

        // 收集结果
        while let Some(result) = self.layered_processor.get_result() {
            self.update_stats(&result);
            
            if result.is_temporary {
                events.push(ProcessingEvent::TemporaryResult(result));
            } else {
                events.push(ProcessingEvent::FinalResult(result));
            }
        }

        events
    }

    pub fn start(&self) {
        self.layered_processor.start();
    }

    pub fn stop(&self) {
        self.layered_processor.stop();
    }

    fn update_stats(&mut self, result: &TranscriptResult) {
        if result.is_temporary {
            self.stats.fast_processing_times.push(result.processing_time_ms);
            if self.stats.fast_processing_times.len() > 100 {
                self.stats.fast_processing_times.remove(0);
            }
        } else {
            self.stats.accurate_processing_times.push(result.processing_time_ms);
            if self.stats.accurate_processing_times.len() > 100 {
                self.stats.accurate_processing_times.remove(0);
            }
        }
    }

    pub fn get_stats(&self) -> ProcessingEvent {
        let avg_fast = if self.stats.fast_processing_times.is_empty() {
            0
        } else {
            self.stats.fast_processing_times.iter().sum::<u64>() / self.stats.fast_processing_times.len() as u64
        };

        let avg_accurate = if self.stats.accurate_processing_times.is_empty() {
            0
        } else {
            self.stats.accurate_processing_times.iter().sum::<u64>() / self.stats.accurate_processing_times.len() as u64
        };

        ProcessingEvent::ProcessingStats {
            fast_queue_size: self.stats.fast_queue_size,
            accurate_queue_size: self.stats.accurate_queue_size,
            avg_fast_time_ms: avg_fast,
            avg_accurate_time_ms: avg_accurate,
        }
    }
}