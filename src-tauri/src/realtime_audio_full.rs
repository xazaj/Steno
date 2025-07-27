use cpal::SampleRate;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::{Arc, Mutex, mpsc};
use std::thread;
use std::time::{Duration, Instant};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State, Manager};
use std::sync::Mutex as StdMutex;
// use webrtc_vad::Vad; // 暂时未使用
use std::ffi::{CStr, CString};
use std::os::raw::c_char;

// 导入whisper相关函数
use crate::{
    whisper_full, whisper_full_default_params, whisper_full_get_segment_text, 
    whisper_full_n_segments, whisper_sampling_strategy_WHISPER_SAMPLING_BEAM_SEARCH,
    WhisperContextState, post_process_text
};
use crate::realtime_speaker_diarization::RealtimeSpeakerDiarization;
use crate::audio_devices;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealtimeConfig {
    pub language: String,
    pub mode: String, // "streaming", "buffered", "hybrid"
    pub speaker_diarization: bool,
    pub noise_reduction: bool,
    pub auto_save: bool,
    pub save_interval: u32, // minutes
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioLevelUpdate {
    pub level: f32,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecognitionResult {
    pub text: String,
    pub confidence: f32,
    pub is_temporary: bool,
    pub speaker: Option<String>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordingStats {
    pub duration: u64, // seconds
    pub segments_count: u32,
    pub speaker_count: u32,
    pub average_confidence: f32,
}

// 音频处理状态
struct AudioProcessor {
    audio_buffer: Vec<f32>,
    continuous_buffer: Vec<f32>, // 连续的音频缓冲区
    last_recognition_time: Instant,
    recognition_interval: Duration, // 识别间隔
    min_audio_length: usize, // 最小音频长度(样本数)
    max_audio_length: usize, // 最大音频长度(样本数)
    activity_threshold: f32, // 活动检测阈值
    speaker_diarization: RealtimeSpeakerDiarization,
}

impl AudioProcessor {
    fn new() -> Result<Self, String> {
        Ok(Self {
            audio_buffer: Vec::new(),
            continuous_buffer: Vec::new(),
            last_recognition_time: Instant::now(),
            recognition_interval: Duration::from_millis(2000), // 每2秒识别一次
            min_audio_length: 16000, // 1秒的音频 (16kHz)
            max_audio_length: 16000 * 10, // 10秒的音频
            activity_threshold: 0.005, // 活动检测阈值
            speaker_diarization: RealtimeSpeakerDiarization::new(),
        })
    }
    
    fn process_audio_chunk(&mut self, audio: &[f32]) -> Option<(Vec<f32>, Option<String>)> {
        // 添加音频到连续缓冲区
        self.continuous_buffer.extend_from_slice(audio);
        
        // 计算当前音频块的平均音量
        let current_level = audio.iter().map(|&x| x.abs()).sum::<f32>() / audio.len() as f32;
        
        // 检查是否有活动音频
        let has_activity = current_level > self.activity_threshold;
        
        if has_activity {
            println!("🎵 Audio activity detected: level={:.6}", current_level);
        }
        
        // 限制缓冲区大小，避免内存溢出
        if self.continuous_buffer.len() > self.max_audio_length {
            let excess = self.continuous_buffer.len() - self.max_audio_length;
            self.continuous_buffer.drain(..excess);
            println!("🔄 Buffer trimmed, removed {} samples", excess);
        }
        
        // 定期或检测到活动时进行识别
        let should_recognize = {
            let time_since_last = self.last_recognition_time.elapsed();
            let has_enough_audio = self.continuous_buffer.len() >= self.min_audio_length;
            
            // 如果有活动且距离上次识别超过间隔时间，或者缓冲区快满了
            (has_activity && time_since_last >= self.recognition_interval && has_enough_audio) ||
            (self.continuous_buffer.len() >= self.max_audio_length * 8 / 10) // 80%满时强制识别
        };
        
        if should_recognize {
            println!("🔍 Triggering recognition: buffer_size={} samples ({:.1}s), activity={}, time_elapsed={:.1}s", 
                self.continuous_buffer.len(), 
                self.continuous_buffer.len() as f32 / 16000.0,
                has_activity, 
                self.last_recognition_time.elapsed().as_secs_f32());
            
            // 取最近的音频数据进行识别
            let recognition_length = self.continuous_buffer.len().min(self.max_audio_length);
            let start_pos = self.continuous_buffer.len() - recognition_length;
            let audio_for_recognition = self.continuous_buffer[start_pos..].to_vec();
            
            // 更新最后识别时间
            self.last_recognition_time = Instant::now();
            
            // 进行说话人识别
            let speaker = if has_activity {
                self.speaker_diarization.identify_speaker(&audio_for_recognition)
            } else {
                None
            };
            
            return Some((audio_for_recognition, speaker));
        }
        
        None
    }
}

// 控制命令枚举
#[derive(Debug)]
enum AudioCommand {
    Start,
    Pause,
    Resume,
    Stop,
}

// 线程安全的音频管理器
pub struct RealtimeAudioCapture {
    command_tx: Option<mpsc::Sender<AudioCommand>>,
    is_recording: Arc<Mutex<bool>>,
    is_paused: Arc<Mutex<bool>>,
    start_time: Option<Instant>,
    recognition_config: RealtimeConfig,
    app_handle: AppHandle,
    audio_data: Arc<Mutex<Vec<f32>>>, // 保存录音数据
    recording_id: String, // 录音ID
}

impl RealtimeAudioCapture {
    pub fn new(app_handle: AppHandle, config: RealtimeConfig) -> Result<Self, Box<dyn std::error::Error>> {
        println!("🔧 创建 RealtimeAudioCapture 实例...");
        
        // 检查音频设备可用性
        let host = cpal::default_host();
        println!("音频主机: {:?}", host.id());
        
        // 检查默认输入设备
        match host.default_input_device() {
            Some(device) => {
                if let Ok(name) = device.name() {
                    println!("✅ 找到默认输入设备: {}", name);
                } else {
                    println!("⚠️ 默认输入设备无法获取名称");
                }
            }
            None => {
                return Err("❌ 未找到任何音频输入设备，请检查麦克风连接".into());
            }
        }
        
        println!("✅ RealtimeAudioCapture 实例创建成功");
        
        // 生成唯一的录音ID
        let recording_id = format!("recording_{}", std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis());
        
        Ok(Self {
            command_tx: None,
            is_recording: Arc::new(Mutex::new(false)),
            is_paused: Arc::new(Mutex::new(false)),
            start_time: None,
            recognition_config: config,
            app_handle,
            audio_data: Arc::new(Mutex::new(Vec::new())),
            recording_id,
        })
    }

    pub fn start_recording(&mut self, whisper_state: Arc<WhisperContextState>) -> Result<(), Box<dyn std::error::Error>> {
        *self.is_recording.lock().unwrap() = true;
        *self.is_paused.lock().unwrap() = false;
        self.start_time = Some(Instant::now());

        let (command_tx, command_rx) = mpsc::channel::<AudioCommand>();
        self.command_tx = Some(command_tx);

        let is_recording = self.is_recording.clone();
        let is_paused = self.is_paused.clone();
        let app_handle = self.app_handle.clone();
        let config = self.recognition_config.clone();
        let audio_data = self.audio_data.clone();

        // 启动独立的音频处理线程
        thread::spawn(move || {
            Self::audio_thread(
                command_rx,
                is_recording,
                is_paused,
                app_handle,
                config,
                whisper_state,
                audio_data,
            );
        });

        Ok(())
    }

    pub fn pause_recording(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        *self.is_paused.lock().unwrap() = true;
        if let Some(ref tx) = self.command_tx {
            let _ = tx.send(AudioCommand::Pause);
        }
        println!("Recording paused");
        Ok(())
    }

    pub fn resume_recording(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        *self.is_paused.lock().unwrap() = false;
        if let Some(ref tx) = self.command_tx {
            let _ = tx.send(AudioCommand::Resume);
        }
        println!("Recording resumed");
        Ok(())
    }

    pub fn stop_recording(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("Stopping recording...");
        
        // 立即设置停止标志
        *self.is_recording.lock().unwrap() = false;
        *self.is_paused.lock().unwrap() = false;
        
        // 发送停止命令
        if let Some(ref tx) = self.command_tx {
            let _ = tx.send(AudioCommand::Stop);
            println!("Stop command sent to audio thread");
        }
        
        // 清理命令通道
        self.command_tx = None;
        
        // 保存录音文件 - 移除 await 调用
        if let Err(e) = self.save_audio_file() {
            eprintln!("保存录音文件失败: {}", e);
        }
        
        // 发送停止完成事件
        let _ = self.app_handle.emit("recording_stopped", ());
        let _ = self.app_handle.emit("recording_completed", ());
        
        println!("Recording stopped successfully");
        Ok(())
    }

    fn save_audio_file(&self) -> Result<(), Box<dyn std::error::Error>> {
        use std::fs::File;
        use std::io::BufWriter;
        
        // 获取音频数据
        let audio_data = self.audio_data.lock().unwrap().clone();
        if audio_data.is_empty() {
            println!("没有音频数据可保存");
            return Ok(());
        }
        
        // 获取应用数据目录
        let app_data_dir = self.app_handle.path().app_data_dir()?;
        let recordings_dir = app_data_dir.join("recordings");
        
        // 创建录音目录
        std::fs::create_dir_all(&recordings_dir)?;
        
        // 生成文件名
        let filename = format!("{}.wav", self.recording_id);
        let file_path = recordings_dir.join(&filename);
        
        // 创建WAV文件
        let spec = hound::WavSpec {
            channels: 1,
            sample_rate: 16000,
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };
        
        let file = File::create(&file_path)?;
        let mut writer = hound::WavWriter::new(BufWriter::new(file), spec)?;
        
        // 写入音频数据
        for &sample in &audio_data {
            writer.write_sample(sample)?;
        }
        
        writer.finalize()?;
        
        println!("录音文件已保存: {:?}", file_path);
        
        // 发送录音文件路径事件 - 使用相对路径，便于前端访问
        let relative_path = format!("recordings/{}", filename);
        let _ = self.app_handle.emit("recording_file_saved", relative_path);
        
        Ok(())
    }

    // 获取录音文件的完整路径
    pub fn get_audio_file_path(&self) -> Result<String, Box<dyn std::error::Error>> {
        let app_data_dir = self.app_handle.path().app_data_dir()?;
        let recordings_dir = app_data_dir.join("recordings");
        let filename = format!("{}.wav", self.recording_id);
        let file_path = recordings_dir.join(&filename);
        Ok(file_path.to_string_lossy().to_string())
    }

    fn audio_thread(
        command_rx: mpsc::Receiver<AudioCommand>,
        is_recording: Arc<Mutex<bool>>,
        is_paused: Arc<Mutex<bool>>,
        app_handle: AppHandle,
        config: RealtimeConfig,
        whisper_state: Arc<WhisperContextState>,
        audio_data: Arc<Mutex<Vec<f32>>>,
    ) {
        println!("Starting audio thread");
        
        // 获取音频主机
        let host = cpal::default_host();
        println!("Audio host: {:?}", host.id());
        
        // 列出所有输入设备
        match host.input_devices() {
            Ok(devices) => {
                println!("Available input devices:");
                for (i, device) in devices.enumerate() {
                    if let Ok(name) = device.name() {
                        println!("  {}: {}", i, name);
                    }
                }
            }
            Err(e) => {
                eprintln!("Failed to enumerate input devices: {}", e);
            }
        }
        
        // 获取选定的输入设备（如果没有选择则使用默认设备）
        let device = match get_selected_input_device_sync(&host) {
            Ok(device) => {
                if let Ok(name) = device.name() {
                    println!("Using selected input device: {}", name);
                } else {
                    println!("Using selected input device (name unavailable)");
                }
                device
            }
            Err(e) => {
                eprintln!("Failed to get selected device, falling back to default: {}", e);
                match host.default_input_device() {
                    Some(device) => {
                        if let Ok(name) = device.name() {
                            println!("Using default input device: {}", name);
                        }
                        device
                    }
                    None => {
                        eprintln!("No input device available");
                        let _ = app_handle.emit("recording_error", "No input device available");
                        return;
                    }
                }
            }
        };
        
        // 检查设备支持的配置
        let supported_configs = match device.supported_input_configs() {
            Ok(configs) => configs.collect::<Vec<_>>(),
            Err(e) => {
                eprintln!("Failed to get supported configs: {}", e);
                let _ = app_handle.emit("recording_error", format!("Failed to get supported configs: {}", e));
                return;
            }
        };
        
        println!("Supported input configurations:");
        for (i, config) in supported_configs.iter().enumerate() {
            println!("  {}: {:?}", i, config);
        }
        
        // 查找最佳配置 - 使用设备支持的最低采样率
        let (stream_config, sample_format, need_resample, original_sample_rate) = if let Some(config) = supported_configs.iter()
            .find(|c| c.channels() >= 1 && c.min_sample_rate() <= SampleRate(16000) && c.max_sample_rate() >= SampleRate(16000)) {
            // 使用支持的配置
            let config_range = config.clone();
            let stream_config = config_range.with_sample_rate(SampleRate(16000)).config();
            (stream_config, config_range.sample_format(), false, 16000)
        } else if let Some(config) = supported_configs.first() {
            // 使用第一个可用配置，稍后重采样
            let original_rate = config.min_sample_rate().0;
            println!("Using config with resampling from {}Hz to 16kHz", original_rate);
            let config_range = config.clone();
            let stream_config = config_range.with_sample_rate(config.min_sample_rate()).config();
            (stream_config, config_range.sample_format(), true, original_rate)
        } else {
            eprintln!("No supported input configurations found");
            let _ = app_handle.emit("recording_error", "No supported input configurations found");
            return;
        };
        
        println!("Selected config: channels={}, sample_rate={:?}, sample_format={:?}, need_resample={}", 
                stream_config.channels, stream_config.sample_rate, sample_format, need_resample);
        
        let (audio_tx, audio_rx) = mpsc::channel::<Vec<f32>>();
        let (level_tx, level_rx) = mpsc::channel::<f32>();
        
        let is_recording_stream = is_recording.clone();
        let is_paused_stream = is_paused.clone();
        let audio_data_storage = audio_data.clone();
        
        // 创建音频流回调
        let stream = match sample_format {
            cpal::SampleFormat::I8 => {
                device.build_input_stream(
                    &stream_config,
                    move |data: &[i8], _: &cpal::InputCallbackInfo| {
                        let recording = *is_recording_stream.lock().unwrap();
                        let paused = *is_paused_stream.lock().unwrap();
                        if recording && !paused {
                            let float_data: Vec<f32> = data.iter().map(|&x| x as f32 / 128.0).collect();
                            let level = float_data.iter().map(|&sample| sample.abs()).sum::<f32>() / float_data.len() as f32;
                            let _ = level_tx.send(level);
                            
                            // 保存原始音频数据
                            if let Ok(mut storage) = audio_data_storage.lock() {
                                storage.extend_from_slice(&float_data);
                            }
                            
                            let _ = audio_tx.send(float_data);
                        }
                    },
                    |err| eprintln!("Audio stream error: {}", err),
                    None,
                )
            }
            cpal::SampleFormat::I16 => {
                device.build_input_stream(
                    &stream_config,
                    move |data: &[i16], _: &cpal::InputCallbackInfo| {
                        let recording = *is_recording_stream.lock().unwrap();
                        let paused = *is_paused_stream.lock().unwrap();
                        if recording && !paused {
                            let float_data: Vec<f32> = data.iter().map(|&x| x as f32 / 32768.0).collect();
                            let level = float_data.iter().map(|&sample| sample.abs()).sum::<f32>() / float_data.len() as f32;
                            let _ = level_tx.send(level);
                            
                            // 保存原始音频数据
                            if let Ok(mut storage) = audio_data_storage.lock() {
                                storage.extend_from_slice(&float_data);
                            }
                            
                            let _ = audio_tx.send(float_data);
                        }
                    },
                    |err| eprintln!("Audio stream error: {}", err),
                    None,
                )
            }
            cpal::SampleFormat::I32 => {
                device.build_input_stream(
                    &stream_config,
                    move |data: &[i32], _: &cpal::InputCallbackInfo| {
                        let recording = *is_recording_stream.lock().unwrap();
                        let paused = *is_paused_stream.lock().unwrap();
                        if recording && !paused {
                            let float_data: Vec<f32> = data.iter().map(|&x| x as f32 / 2147483648.0).collect();
                            let level = float_data.iter().map(|&sample| sample.abs()).sum::<f32>() / float_data.len() as f32;
                            let _ = level_tx.send(level);
                            
                            // 保存原始音频数据
                            if let Ok(mut storage) = audio_data_storage.lock() {
                                storage.extend_from_slice(&float_data);
                            }
                            
                            let _ = audio_tx.send(float_data);
                        }
                    },
                    |err| eprintln!("Audio stream error: {}", err),
                    None,
                )
            }
            cpal::SampleFormat::F32 => {
                device.build_input_stream(
                    &stream_config,
                    move |data: &[f32], _: &cpal::InputCallbackInfo| {
                        let recording = *is_recording_stream.lock().unwrap();
                        let paused = *is_paused_stream.lock().unwrap();
                        if recording && !paused {
                            let level = data.iter().map(|&sample| sample.abs()).sum::<f32>() / data.len() as f32;
                            let _ = level_tx.send(level);
                            // 重采样到16kHz（如果需要）
                            let float_data = if need_resample {
                                let ratio = original_sample_rate as f64 / 16000.0;
                                let output_len = (data.len() as f64 / ratio) as usize;
                                let mut resampled = Vec::with_capacity(output_len);
                                
                                for i in 0..output_len {
                                    let src_index = (i as f64 * ratio) as usize;
                                    if src_index < data.len() {
                                        resampled.push(data[src_index]);
                                    } else {
                                        resampled.push(0.0);
                                    }
                                }
                                println!("Resampled audio: {} -> {} samples", data.len(), resampled.len());
                                resampled
                            } else {
                                data.to_vec()
                            };
                            
                            // 保存原始音频数据
                            if let Ok(mut storage) = audio_data_storage.lock() {
                                storage.extend_from_slice(&float_data);
                            }
                            
                            // 发送音频数据到处理线程
                            if let Err(_) = audio_tx.send(float_data.clone()) {
                                println!("Failed to send audio data to processing thread");
                            } else {
                                println!("Sent {} audio samples to processing thread", float_data.len());
                            }
                        }
                    },
                    |err| eprintln!("Audio stream error: {}", err),
                    None,
                )
            }
            _ => {
                eprintln!("Unsupported sample format: {:?}", sample_format);
                let _ = app_handle.emit("recording_error", format!("Unsupported sample format: {:?}", sample_format));
                return;
            }
        };
        
        let stream = match stream {
            Ok(stream) => {
                println!("Audio stream created successfully");
                stream
            }
            Err(e) => {
                eprintln!("Failed to build audio stream: {}", e);
                let _ = app_handle.emit("recording_error", format!("Failed to build audio stream: {}", e));
                return;
            }
        };
        
        if let Err(e) = stream.play() {
            eprintln!("Failed to start audio stream: {}", e);
            let _ = app_handle.emit("recording_error", format!("Failed to start audio stream: {}", e));
            return;
        } else {
            println!("Audio stream started successfully");
            let _ = app_handle.emit("recording_started", ());
        }
        
        // 启动音频级别监控线程
        let app_handle_level = app_handle.clone();
        thread::spawn(move || {
            while let Ok(level) = level_rx.recv() {
                let level_update = AudioLevelUpdate {
                    level: level * 5.0,
                    timestamp: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_millis() as u64,
                };
                let _ = app_handle_level.emit("audio_level_update", level_update);
            }
        });
        
        // 启动音频处理和识别线程
        let app_handle_processing = app_handle.clone();
        let is_recording_processing = is_recording.clone();
        thread::spawn(move || {
            Self::audio_processing_thread(
                audio_rx,
                app_handle_processing,
                config,
                is_recording_processing,
                whisper_state,
            );
        });
        
        // 命令处理循环
        while let Ok(command) = command_rx.recv() {
            match command {
                AudioCommand::Start => {
                    println!("Audio thread: Start command received");
                }
                AudioCommand::Pause => {
                    println!("Audio thread: Pause command received");
                }
                AudioCommand::Resume => {
                    println!("Audio thread: Resume command received");
                }
                AudioCommand::Stop => {
                    println!("Audio thread: Stop command received");
                    break;
                }
            }
        }
        
        drop(stream);
        println!("Audio thread ended");
    }
    
    fn audio_processing_thread(
        audio_rx: mpsc::Receiver<Vec<f32>>,
        app_handle: AppHandle,
        config: RealtimeConfig,
        is_recording: Arc<Mutex<bool>>,
        whisper_state: Arc<WhisperContextState>,
    ) {
        println!("🚀 Audio processing thread starting...");
        
        let mut processor = match AudioProcessor::new() {
            Ok(p) => {
                println!("✅ Audio processor created successfully");
                p
            },
            Err(e) => {
                eprintln!("❌ Failed to create audio processor: {}", e);
                return;
            }
        };

        let mut segment_id = 0u32;
        let mut total_segments = 0u32;
        let mut confidence_sum = 0.0f32;

        println!("🎵 Audio processing thread ready, waiting for audio data...");

        // 使用更安全的循环检查
        loop {
            // 检查录音状态
            let recording = match is_recording.lock() {
                Ok(guard) => *guard,
                Err(e) => {
                    eprintln!("❌ Failed to lock recording state: {}", e);
                    break;
                }
            };
            
            if !recording {
                println!("🛑 Recording stopped, exiting audio processing thread");
                break;
            }
            match audio_rx.recv_timeout(Duration::from_millis(100)) {
                Ok(audio_chunk) => {
                    println!("📊 Processing audio chunk with {} samples", audio_chunk.len());
                    
                    // 安全地处理音频块
                    match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                        processor.process_audio_chunk(&audio_chunk)
                    })) {
                        Ok(result) => {
                            if let Some((speech_audio, speaker)) = result {
                                println!("🎯 Processing speech segment of {} samples", speech_audio.len());
                                
                                // 安全地使用Whisper进行识别
                                match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                                    Self::recognize_speech_segment_optimized(&speech_audio, &config, &whisper_state)
                                })) {
                                    Ok(recognition_result) => match recognition_result {
                                        Ok(text) => {
                                            if !text.trim().is_empty() {
                                                let confidence = 0.85 + (speech_audio.len() as f32 / 32000.0 * 0.1).min(0.15);
                                                confidence_sum += confidence;
                                                total_segments += 1;

                                                let result = RecognitionResult {
                                                    text: text.clone(),
                                                    confidence,
                                                    is_temporary: false,
                                                    speaker: if config.speaker_diarization {
                                                        speaker.clone()
                                                    } else {
                                                        None
                                                    },
                                                    timestamp: std::time::SystemTime::now()
                                                        .duration_since(std::time::UNIX_EPOCH)
                                                        .unwrap()
                                                        .as_millis() as u64,
                                                };

                                                println!("✅ Recognition result: {}", text);
                                                let _ = app_handle.emit("recognition_result", result);

                                                segment_id += 1;

                                                // 发送统计信息
                                                let stats = RecordingStats {
                                                    duration: segment_id as u64 * 2, // 估算时长
                                                    segments_count: total_segments,
                                                    speaker_count: if config.speaker_diarization { 2 } else { 1 },
                                                    average_confidence: if total_segments > 0 { confidence_sum / total_segments as f32 } else { 0.0 },
                                                };
                                                let _ = app_handle.emit("recording_stats", stats);
                                            }
                                        }
                                        Err(e) => {
                                            eprintln!("❌ Recognition failed: {}", e);
                                        }
                                    },
                                    Err(_) => {
                                        eprintln!("⚠️ Recognition panicked, skipping this segment");
                                    }
                                }
                            }
                        },
                        Err(_) => {
                            eprintln!("⚠️ Audio processing panicked, skipping this chunk");
                        }
                    }
                },
                Err(mpsc::RecvTimeoutError::Timeout) => {
                    // 定期发送心跳统计
                    if total_segments > 0 {
                        let stats = RecordingStats {
                            duration: segment_id as u64 * 2,
                            segments_count: total_segments,
                            speaker_count: if config.speaker_diarization { 2 } else { 1 },
                            average_confidence: confidence_sum / total_segments as f32,
                        };
                        let _ = app_handle.emit("recording_stats", stats);
                    }
                },
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    println!("Audio processing thread: channel disconnected");
                    break;
                }
            }
        }

        println!("Audio processing thread ended");
    }

    fn recognize_speech_segment_optimized(
        audio: &[f32],
        config: &RealtimeConfig,
        whisper_state: &WhisperContextState,
    ) -> Result<String, String> {
        println!("🎯 Starting Whisper recognition for {} samples ({:.2}s)", 
            audio.len(), audio.len() as f32 / 16000.0);
        
        // 检查音频长度
        if audio.len() < 1600 { // 少于0.1秒的音频跳过
            println!("⚠️ Audio too short for recognition: {} samples", audio.len());
            return Ok(String::new());
        }
        
        // 预处理：标准化音频
        let normalized_audio = Self::normalize_audio(audio);
        
        Self::recognize_speech_segment(&normalized_audio, config, whisper_state)
    }
    
    fn normalize_audio(audio: &[f32]) -> Vec<f32> {
        // 计算RMS
        let rms = (audio.iter().map(|&x| x * x).sum::<f32>() / audio.len() as f32).sqrt();
        
        if rms < 0.001 {
            // 音频太安静，直接返回
            return audio.to_vec();
        }
        
        // 标准化到适当的音量
        let target_rms = 0.1;
        let gain = target_rms / rms;
        let max_gain = 10.0; // 限制最大增益
        let actual_gain = gain.min(max_gain);
        
        println!("🔊 Audio normalization: RMS={:.6} -> gain={:.2}", rms, actual_gain);
        
        audio.iter().map(|&x| (x * actual_gain).clamp(-1.0, 1.0)).collect()
    }

    fn recognize_speech_segment(
        audio: &[f32],
        config: &RealtimeConfig,
        whisper_state: &WhisperContextState,
    ) -> Result<String, String> {
        println!("🔒 Attempting to acquire Whisper context lock...");
        
        let ctx = match whisper_state.ctx.lock() {
            Ok(ctx) => {
                println!("✅ Whisper context lock acquired");
                ctx
            },
            Err(e) => {
                println!("❌ Failed to acquire Whisper context lock: {}", e);
                return Err("Failed to acquire Whisper context lock".to_string());
            }
        };
        
        // 验证Whisper上下文
        if ctx.is_null() {
            println!("❌ Whisper context is null");
            return Err("Whisper context is null".to_string());
        }
        
        println!("🔧 Setting up Whisper parameters...");
        
        // 使用贪婪搜索而不是beam search，更快更稳定
        let mut params = unsafe { 
            whisper_full_default_params(whisper_sampling_strategy_WHISPER_SAMPLING_BEAM_SEARCH) 
        };
        
        // 针对实时识别的保守参数设置
        params.temperature = 0.0;
        params.suppress_blank = true;
        params.token_timestamps = false;
        params.max_len = 1;
        params.n_threads = 1; // 使用单线程避免竞争
        params.beam_search.beam_size = 1; // 最小beam size
        params.greedy.best_of = 1;
        params.translate = false; // 禁用翻译
        params.no_context = true; // 禁用上下文，提高稳定性
        
        // 语言设置
        let lang_cstring = match config.language.as_str() {
            "zh" => Some(CString::new("zh").unwrap()),
            "en" => Some(CString::new("en").unwrap()),
            _ => None,
        };
        
        if let Some(ref lang_str) = lang_cstring {
            params.language = lang_str.as_ptr();
        } else {
            params.language = std::ptr::null();
        }
        
        // 验证音频数据
        if audio.is_empty() {
            println!("⚠️ Audio data is empty");
            return Ok(String::new());
        }
        
        println!("📊 Audio data: {} samples, range: [{:.6}, {:.6}]", 
            audio.len(), 
            audio.iter().min_by(|a, b| a.partial_cmp(b).unwrap()).unwrap_or(&0.0),
            audio.iter().max_by(|a, b| a.partial_cmp(b).unwrap()).unwrap_or(&0.0)
        );
        
        // 创建音频数据副本并确保数据有效
        let mut audio_copy: Vec<f32> = audio.iter()
            .map(|&x| x.clamp(-1.0, 1.0)) // 确保音频在有效范围内
            .collect();
        
        println!("🚀 Starting Whisper recognition...");
        
        // 安全地执行识别
        let result = unsafe {
            whisper_full(
                *ctx,
                params,
                audio_copy.as_mut_ptr(),
                audio_copy.len() as i32,
            )
        };
        
        println!("📝 Whisper recognition result: {}", result);
        
        if result != 0 {
            println!("❌ Whisper recognition failed with code: {}", result);
            return Err(format!("Whisper recognition failed with code: {}", result));
        }
        
        // 安全地提取文本
        let num_segments = unsafe { whisper_full_n_segments(*ctx) };
        println!("📋 Number of segments: {}", num_segments);
        
        if num_segments == 0 {
            println!("⚠️ No segments recognized");
            return Ok(String::new());
        }
        
        let mut text = String::new();
        
        for i in 0..num_segments {
            let segment_ptr = unsafe { whisper_full_get_segment_text(*ctx, i) };
            if !segment_ptr.is_null() {
                let c_str = unsafe { CStr::from_ptr(segment_ptr as *const c_char) };
                match c_str.to_str() {
                    Ok(segment_text) => {
                        println!("📝 Segment {}: '{}'", i, segment_text);
                        text.push_str(segment_text);
                    },
                    Err(e) => {
                        println!("⚠️ Failed to convert segment {} to string: {}", i, e);
                    }
                }
            } else {
                println!("⚠️ Segment {} pointer is null", i);
            }
        }
        
        println!("📜 Raw recognized text: '{}'", text);
        
        // 如果没有识别到任何文本，返回空字符串
        if text.trim().is_empty() {
            println!("ℹ️ No text recognized");
            return Ok(String::new());
        }
        
        // 文本后处理
        let processed_text = post_process_text(&text, &config.language);
        println!("✨ Processed text: '{}'", processed_text);
        
        Ok(processed_text)
    }

    pub fn get_recording_duration(&self) -> u64 {
        if let Some(start_time) = self.start_time {
            start_time.elapsed().as_secs()
        } else {
            0
        }
    }
}

// 线程安全的状态包装器  
pub struct AudioCaptureState {
    inner: StdMutex<Option<RealtimeAudioCapture>>,
}

impl AudioCaptureState {
    pub fn new() -> Self {
        AudioCaptureState {
            inner: StdMutex::new(None),
        }
    }
    
    pub fn lock(&self) -> Result<std::sync::MutexGuard<Option<RealtimeAudioCapture>>, std::sync::PoisonError<std::sync::MutexGuard<Option<RealtimeAudioCapture>>>> {
        self.inner.lock()
    }
}

unsafe impl Send for AudioCaptureState {}
unsafe impl Sync for AudioCaptureState {}

impl Default for AudioCaptureState {
    fn default() -> Self {
        Self::new()
    }
}

// Tauri命令实现
#[tauri::command]
pub async fn start_realtime_recording(
    app_handle: AppHandle,
    config: RealtimeConfig,
    state: State<'_, AudioCaptureState>,
    whisper_state: State<'_, WhisperContextState>,
) -> Result<(), String> {
    println!("🎤 开始初始化实时录音...");
    println!("配置: {:?}", config);
    
    let mut capture_state = state.lock().map_err(|e| {
        let error_msg = format!("无法获取录音状态锁: {}", e);
        eprintln!("{}", error_msg);
        error_msg
    })?;
    
    // 创建新的音频捕获实例
    let mut capture = RealtimeAudioCapture::new(app_handle, config)
        .map_err(|e| format!("Failed to create audio capture: {}", e))?;
    
    // 启动录音
    let whisper_state_arc = Arc::new(WhisperContextState {
        ctx: Mutex::new(*whisper_state.ctx.lock().unwrap()),
    });
    
    capture.start_recording(whisper_state_arc)
        .map_err(|e| format!("Failed to start recording: {}", e))?;
    
    *capture_state = Some(capture);
    println!("Realtime recording started");
    Ok(())
}

#[tauri::command]
pub async fn pause_realtime_recording(
    state: State<'_, AudioCaptureState>,
) -> Result<(), String> {
    let mut capture_state = state.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref mut capture) = capture_state.as_mut() {
        capture.pause_recording().map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn resume_realtime_recording(
    state: State<'_, AudioCaptureState>,
) -> Result<(), String> {
    let mut capture_state = state.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref mut capture) = capture_state.as_mut() {
        capture.resume_recording().map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn stop_realtime_recording(
    state: State<'_, AudioCaptureState>,
) -> Result<(), String> {
    let mut capture_state = state.lock().map_err(|e| e.to_string())?;
    
    if let Some(mut capture) = capture_state.take() {
        capture.stop_recording().map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn get_recording_duration(
    state: State<'_, AudioCaptureState>,
) -> Result<u64, String> {
    let capture_state = state.lock().map_err(|e| e.to_string())?;
    
    if let Some(ref capture) = capture_state.as_ref() {
        Ok(capture.get_recording_duration())
    } else {
        Ok(0)
    }
}

// 获取用户选定的输入设备 (异步版本)
async fn get_selected_input_device(host: &cpal::Host) -> Result<cpal::Device, String> {
    // 尝试获取全局选定的设备ID
    let selected_device_id = audio_devices::get_global_audio_device("input".to_string()).await?;
    
    if let Some(device_id) = selected_device_id {
        // 解析设备ID
        let device_index: usize = device_id
            .strip_prefix("input_")
            .and_then(|s| s.parse().ok())
            .ok_or("Invalid device ID format")?;
        
        // 获取设备列表
        let devices: Vec<_> = host.input_devices()
            .map_err(|e| format!("Failed to enumerate devices: {}", e))?
            .collect();
        
        // 获取指定的设备
        devices.get(device_index)
            .cloned()
            .ok_or("Selected device not found".to_string())
    } else {
        // 如果没有选择设备，返回默认设备
        host.default_input_device()
            .ok_or("No default input device available".to_string())
    }
}

// 获取用户选定的输入设备 (同步版本)
fn get_selected_input_device_sync(host: &cpal::Host) -> Result<cpal::Device, String> {
    // 使用tokio的阻塞调用来执行异步函数
    let rt = tokio::runtime::Runtime::new()
        .map_err(|e| format!("Failed to create tokio runtime: {}", e))?;
    
    rt.block_on(async {
        // 尝试获取全局选定的设备ID
        let selected_device_id = audio_devices::get_global_audio_device("input".to_string()).await?;
        
        if let Some(device_id) = selected_device_id {
            // 解析设备ID
            let device_index: usize = device_id
                .strip_prefix("input_")
                .and_then(|s| s.parse().ok())
                .ok_or("Invalid device ID format")?;
            
            // 获取设备列表
            let devices: Vec<_> = host.input_devices()
                .map_err(|e| format!("Failed to enumerate devices: {}", e))?
                .collect();
            
            // 获取指定的设备
            devices.get(device_index)
                .cloned()
                .ok_or("Selected device not found".to_string())
        } else {
            // 如果没有选择设备，返回默认设备
            host.default_input_device()
                .ok_or("No default input device available".to_string())
        }
    })
}