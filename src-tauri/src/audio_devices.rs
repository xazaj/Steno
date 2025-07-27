use cpal::traits::{DeviceTrait, HostTrait};
use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDevice {
    pub id: String,
    pub name: String,
    pub is_default: bool,
    pub device_type: String, // "input" or "output"
    pub supported_sample_rates: Vec<u32>,
    pub supported_channels: Vec<u16>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDeviceInfo {
    pub input_devices: Vec<AudioDevice>,
    pub output_devices: Vec<AudioDevice>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioTestResult {
    pub success: bool,
    pub message: String,
    pub level: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MicTestState {
    pub phase: String, // "monitoring", "recording", "playback", "completed"
    pub volume_level: f32,
    pub countdown: i32,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordedAudio {
    pub data: Vec<f32>,
    pub sample_rate: u32,
    pub channels: u16,
}

#[command]
pub async fn get_audio_devices() -> Result<AudioDeviceInfo, String> {
    let host = cpal::default_host();
    
    let mut input_devices = Vec::new();
    let mut output_devices = Vec::new();
    
    // 获取默认设备
    let default_input = host.default_input_device();
    let default_output = host.default_output_device();
    
    let default_input_name = if let Some(ref device) = default_input {
        device.name().unwrap_or_default()
    } else {
        String::new()
    };
    
    let default_output_name = if let Some(ref device) = default_output {
        device.name().unwrap_or_default()
    } else {
        String::new()
    };
    
    // 枚举输入设备
    if let Ok(devices) = host.input_devices() {
        for (index, device) in devices.enumerate() {
            if let Ok(name) = device.name() {
                let is_default = name == default_input_name;
                
                // 获取支持的配置
                let (sample_rates, channels) = get_device_capabilities(&device);
                
                input_devices.push(AudioDevice {
                    id: format!("input_{}", index),
                    name: name.clone(),
                    is_default,
                    device_type: "input".to_string(),
                    supported_sample_rates: sample_rates,
                    supported_channels: channels,
                });
            }
        }
    }
    
    // 枚举输出设备
    if let Ok(devices) = host.output_devices() {
        for (index, device) in devices.enumerate() {
            if let Ok(name) = device.name() {
                let is_default = name == default_output_name;
                
                // 获取支持的配置
                let (sample_rates, channels) = get_device_capabilities(&device);
                
                output_devices.push(AudioDevice {
                    id: format!("output_{}", index),
                    name: name.clone(),
                    is_default,
                    device_type: "output".to_string(),
                    supported_sample_rates: sample_rates,
                    supported_channels: channels,
                });
            }
        }
    }
    
    Ok(AudioDeviceInfo {
        input_devices,
        output_devices,
    })
}

fn get_device_capabilities(device: &cpal::Device) -> (Vec<u32>, Vec<u16>) {
    let mut sample_rates = Vec::new();
    let mut channels = Vec::new();
    
    if let Ok(configs) = device.supported_input_configs() {
        for config in configs {
            // 添加采样率范围
            let min_rate = config.min_sample_rate().0;
            let max_rate = config.max_sample_rate().0;
            
            // 常用采样率
            for rate in [8000, 16000, 22050, 44100, 48000, 96000] {
                if rate >= min_rate && rate <= max_rate && !sample_rates.contains(&rate) {
                    sample_rates.push(rate);
                }
            }
            
            // 添加通道数
            let channel_count = config.channels();
            if !channels.contains(&channel_count) {
                channels.push(channel_count);
            }
        }
    }
    
    // 如果没有获取到配置，提供默认值
    if sample_rates.is_empty() {
        sample_rates.push(44100);
    }
    if channels.is_empty() {
        channels.push(1);
    }
    
    sample_rates.sort();
    channels.sort();
    
    (sample_rates, channels)
}

#[command]
pub async fn test_audio_device(device_id: String, device_type: String) -> Result<AudioTestResult, String> {
    let host = cpal::default_host();
    
    if device_type == "input" {
        test_input_device(&host, &device_id)
    } else if device_type == "output" {
        test_output_device(&host, &device_id)
    } else {
        Err("Invalid device type".to_string())
    }
}

fn test_input_device(host: &cpal::Host, device_id: &str) -> Result<AudioTestResult, String> {
    use cpal::traits::StreamTrait;
    use std::sync::{Arc, Mutex};
    use std::time::{Duration, Instant};
    use std::thread;
    
    // 解析设备ID获取索引
    let device_index: usize = device_id
        .strip_prefix("input_")
        .and_then(|s| s.parse().ok())
        .ok_or("Invalid device ID")?;
    
    // 获取指定设备
    let devices: Vec<_> = host.input_devices()
        .map_err(|e| format!("Failed to enumerate devices: {}", e))?
        .collect();
    
    let device = devices.get(device_index)
        .ok_or("Device not found")?;
    
    // 获取设备配置
    let supported_configs = device.supported_input_configs()
        .map_err(|e| format!("Failed to get supported configs: {}", e))?
        .collect::<Vec<_>>();
    
    let config = supported_configs.first()
        .ok_or("No supported configurations")?;
    
    let stream_config = config.with_max_sample_rate().config();
    let sample_format = config.sample_format();
    
    // 音频级别监测
    let audio_level = Arc::new(Mutex::new(0.0f32));
    let audio_level_clone = audio_level.clone();
    
    // 创建音频流
    let stream = match sample_format {
        cpal::SampleFormat::F32 => {
            device.build_input_stream(
                &stream_config,
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    let level = data.iter().map(|&sample| sample.abs()).sum::<f32>() / data.len() as f32;
                    if let Ok(mut current_level) = audio_level_clone.lock() {
                        *current_level = level;
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
                    let float_data: Vec<f32> = data.iter().map(|&x| x as f32 / 32768.0).collect();
                    let level = float_data.iter().map(|&sample| sample.abs()).sum::<f32>() / float_data.len() as f32;
                    if let Ok(mut current_level) = audio_level_clone.lock() {
                        *current_level = level;
                    }
                },
                |err| eprintln!("Audio stream error: {}", err),
                None,
            )
        }
        _ => return Err(format!("Unsupported sample format: {:?}", sample_format)),
    };
    
    let stream = stream.map_err(|e| format!("Failed to build stream: {}", e))?;
    stream.play().map_err(|e| format!("Failed to start stream: {}", e))?;
    
    // 测试2秒
    let start_time = Instant::now();
    let mut max_level = 0.0f32;
    
    while start_time.elapsed() < Duration::from_secs(2) {
        thread::sleep(Duration::from_millis(100));
        if let Ok(level) = audio_level.lock() {
            max_level = max_level.max(*level);
        }
    }
    
    drop(stream);
    
    let success = max_level > 0.001; // 检测到声音信号
    let message = if success {
        format!("输入设备测试成功，检测到音频信号 (最大音量: {:.3})", max_level)
    } else {
        "输入设备测试完成，未检测到音频信号，请检查麦克风是否正常工作".to_string()
    };
    
    Ok(AudioTestResult {
        success,
        message,
        level: Some(max_level),
    })
}

fn test_output_device(host: &cpal::Host, device_id: &str) -> Result<AudioTestResult, String> {
    use cpal::traits::StreamTrait;
    use std::f32::consts::PI;
    use std::time::Duration;
    use std::thread;
    use std::sync::{Arc, Mutex};
    use std::sync::atomic::Ordering;
    
    // 解析设备ID获取索引
    let device_index: usize = device_id
        .strip_prefix("output_")
        .and_then(|s| s.parse().ok())
        .ok_or("Invalid device ID")?;
    
    // 获取指定设备
    let devices: Vec<_> = host.output_devices()
        .map_err(|e| format!("Failed to enumerate devices: {}", e))?
        .collect();
    
    let device = devices.get(device_index)
        .ok_or("Device not found")?;
    
    // 获取设备配置
    let supported_configs = device.supported_output_configs()
        .map_err(|e| format!("Failed to get supported configs: {}", e))?
        .collect::<Vec<_>>();
    
    let config = supported_configs.first()
        .ok_or("No supported configurations")?;
    
    let stream_config = config.with_max_sample_rate().config();
    let sample_format = config.sample_format();
    let sample_rate = stream_config.sample_rate.0 as f32;
    let channels = stream_config.channels as usize;
    
    // 重置全局停止标志
    STOP_TEST_AUDIO.store(false, Ordering::Relaxed);
    
    // 生成1000Hz测试音调，但有音量渐变控制
    let sample_clock = Arc::new(Mutex::new(0f32));
    let frequency = 1000.0;
    
    // 创建音频流
    let stream = match sample_format {
        cpal::SampleFormat::F32 => {
            let sample_clock_clone = sample_clock.clone();
            device.build_output_stream(
                &stream_config,
                move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
                    if STOP_TEST_AUDIO.load(Ordering::Relaxed) {
                        // 如果需要停止，填充静音
                        for sample in data.iter_mut() {
                            *sample = 0.0;
                        }
                        return;
                    }
                    
                    if let Ok(mut clock) = sample_clock_clone.lock() {
                        for frame in data.chunks_mut(channels) {
                            let value = (*clock * frequency * 2.0 * PI / sample_rate).sin() * 0.1;
                            for sample in frame.iter_mut() {
                                *sample = value;
                            }
                            *clock = (*clock + 1.0) % sample_rate;
                        }
                    }
                },
                |err| eprintln!("Audio stream error: {}", err),
                None,
            )
        }
        cpal::SampleFormat::I16 => {
            let sample_clock_clone = sample_clock.clone();
            device.build_output_stream(
                &stream_config,
                move |data: &mut [i16], _: &cpal::OutputCallbackInfo| {
                    if STOP_TEST_AUDIO.load(Ordering::Relaxed) {
                        // 如果需要停止，填充静音
                        for sample in data.iter_mut() {
                            *sample = 0;
                        }
                        return;
                    }
                    
                    if let Ok(mut clock) = sample_clock_clone.lock() {
                        for frame in data.chunks_mut(channels) {
                            let value = ((*clock * frequency * 2.0 * PI / sample_rate).sin() * 0.1 * 32767.0) as i16;
                            for sample in frame.iter_mut() {
                                *sample = value;
                            }
                            *clock = (*clock + 1.0) % sample_rate;
                        }
                    }
                },
                |err| eprintln!("Audio stream error: {}", err),
                None,
            )
        }
        _ => return Err(format!("Unsupported sample format: {:?}", sample_format)),
    };
    
    let stream = stream.map_err(|e| format!("Failed to build stream: {}", e))?;
    stream.play().map_err(|e| format!("Failed to start stream: {}", e))?;
    
    // 播放1秒测试音，或者直到被停止
    for _ in 0..10 { // 检查10次，每次100ms
        thread::sleep(Duration::from_millis(100));
        if STOP_TEST_AUDIO.load(Ordering::Relaxed) {
            break;
        }
    }
    
    // 设置停止标志
    STOP_TEST_AUDIO.store(true, Ordering::Relaxed);
    
    // 等待一小段时间让音频缓冲区清空
    thread::sleep(Duration::from_millis(100));
    
    // 停止并销毁流
    drop(stream);
    
    Ok(AudioTestResult {
        success: true,
        message: "输出设备测试完成，已播放1000Hz测试音调".to_string(),
        level: None,
    })
}

// 全局设备设置存储
static mut GLOBAL_INPUT_DEVICE: Option<String> = None;
static mut GLOBAL_OUTPUT_DEVICE: Option<String> = None;

// 全局测试音控制
use std::sync::atomic::{AtomicBool, Ordering};
static STOP_TEST_AUDIO: AtomicBool = AtomicBool::new(false);

// 麦克风测试状态管理
use std::sync::{Arc, Mutex};
use lazy_static::lazy_static;

lazy_static! {
    static ref MIC_TEST_STATE: Arc<Mutex<Option<MicTestState>>> = Arc::new(Mutex::new(None));
    static ref RECORDED_AUDIO: Arc<Mutex<Option<RecordedAudio>>> = Arc::new(Mutex::new(None));
}

#[command]
pub async fn stop_audio_test() -> Result<(), String> {
    STOP_TEST_AUDIO.store(true, Ordering::Relaxed);
    Ok(())
}

// 启动新的麦克风测试
#[command]
pub async fn start_mic_test(device_id: String) -> Result<(), String> {
    use std::thread;
    use std::time::Duration;
    
    let device_id_clone = device_id.clone();
    
    thread::spawn(move || {
        if let Err(e) = run_mic_test(&device_id_clone) {
            eprintln!("Mic test error: {}", e);
            // 设置错误状态
            if let Ok(mut state) = MIC_TEST_STATE.lock() {
                *state = Some(MicTestState {
                    phase: "error".to_string(),
                    volume_level: 0.0,
                    countdown: 0,
                    message: format!("测试失败: {}", e),
                });
            }
        }
    });
    
    Ok(())
}

// 获取麦克风测试状态
#[command]
pub async fn get_mic_test_state() -> Result<Option<MicTestState>, String> {
    if let Ok(state) = MIC_TEST_STATE.lock() {
        Ok(state.clone())
    } else {
        Err("Failed to get test state".to_string())
    }
}

// 播放录制的音频
#[command]
pub async fn play_recorded_audio() -> Result<(), String> {
    let host = cpal::default_host();
    
    // 获取录制的音频数据
    let audio_data = {
        if let Ok(audio) = RECORDED_AUDIO.lock() {
            if let Some(ref recorded) = *audio {
                recorded.clone()
            } else {
                return Err("No recorded audio available".to_string());
            }
        } else {
            return Err("Failed to access recorded audio".to_string());
        }
    };
    
    play_audio_data(&host, audio_data)?;
    
    Ok(())
}

// 执行麦克风测试的核心函数
fn run_mic_test(device_id: &str) -> Result<(), String> {
    use cpal::traits::StreamTrait;
    use std::sync::{Arc, Mutex};
    use std::thread;
    use std::time::{Duration, Instant};
    
    let host = cpal::default_host();
    
    // 解析设备ID获取索引
    let device_index: usize = device_id
        .strip_prefix("input_")
        .and_then(|s| s.parse().ok())
        .ok_or("Invalid device ID")?;
    
    // 获取指定设备
    let devices: Vec<_> = host.input_devices()
        .map_err(|e| format!("Failed to enumerate devices: {}", e))?
        .collect();
    
    let device = devices.get(device_index)
        .ok_or("Device not found")?;
    
    // 获取设备配置
    let supported_configs = device.supported_input_configs()
        .map_err(|e| format!("Failed to get supported configs: {}", e))?
        .collect::<Vec<_>>();
    
    let config = supported_configs.first()
        .ok_or("No supported configurations")?;
    
    let stream_config = config.with_max_sample_rate().config();
    let sample_format = config.sample_format();
    let sample_rate = stream_config.sample_rate.0;
    let channels = stream_config.channels;
    
    // 共享的音频数据和音量
    let audio_buffer = Arc::new(Mutex::new(Vec::<f32>::new()));
    let current_volume = Arc::new(Mutex::new(0.0f32));
    
    let audio_buffer_clone = audio_buffer.clone();
    let current_volume_clone = current_volume.clone();
    
    // 创建音频流
    let stream = match sample_format {
        cpal::SampleFormat::F32 => {
            device.build_input_stream(
                &stream_config,
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    // 计算音量
                    let level = data.iter().map(|&sample| sample.abs()).sum::<f32>() / data.len() as f32;
                    if let Ok(mut vol) = current_volume_clone.lock() {
                        *vol = level;
                    }
                    
                    // 存储音频数据
                    if let Ok(mut buffer) = audio_buffer_clone.lock() {
                        buffer.extend_from_slice(data);
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
                    let float_data: Vec<f32> = data.iter().map(|&x| x as f32 / 32768.0).collect();
                    
                    // 计算音量
                    let level = float_data.iter().map(|&sample| sample.abs()).sum::<f32>() / float_data.len() as f32;
                    if let Ok(mut vol) = current_volume_clone.lock() {
                        *vol = level;
                    }
                    
                    // 存储音频数据
                    if let Ok(mut buffer) = audio_buffer_clone.lock() {
                        buffer.extend(float_data);
                    }
                },
                |err| eprintln!("Audio stream error: {}", err),
                None,
            )
        }
        _ => return Err(format!("Unsupported sample format: {:?}", sample_format)),
    };
    
    let stream = stream.map_err(|e| format!("Failed to build stream: {}", e))?;
    stream.play().map_err(|e| format!("Failed to start stream: {}", e))?;
    
    // 阶段1: 实时音量监测 (3秒)
    update_test_state("monitoring", 0.0, 0, "请对着麦克风说话，观察音量指示...");
    
    let start_time = Instant::now();
    while start_time.elapsed() < Duration::from_secs(3) {
        thread::sleep(Duration::from_millis(100));
        if let Ok(vol) = current_volume.lock() {
            let remaining = 3 - start_time.elapsed().as_secs() as i32;
            update_test_state("monitoring", *vol, remaining, "请对着麦克风说话，观察音量指示...");
        }
    }
    
    // 清空之前的音频缓冲区
    if let Ok(mut buffer) = audio_buffer.lock() {
        buffer.clear();
    }
    
    // 阶段2: 录音测试 (5秒)
    update_test_state("recording", 0.0, 5, "开始录音！请说一段话进行测试...");
    
    let start_time = Instant::now();
    while start_time.elapsed() < Duration::from_secs(5) {
        thread::sleep(Duration::from_millis(100));
        if let Ok(vol) = current_volume.lock() {
            let remaining = 5 - start_time.elapsed().as_secs() as i32;
            update_test_state("recording", *vol, remaining, "录音中，请继续说话...");
        }
    }
    
    // 停止录音
    drop(stream);
    
    // 保存录制的音频
    if let Ok(buffer) = audio_buffer.lock() {
        let recorded = RecordedAudio {
            data: buffer.clone(),
            sample_rate,
            channels,
        };
        
        if let Ok(mut audio) = RECORDED_AUDIO.lock() {
            *audio = Some(recorded);
        }
    }
    
    // 阶段3: 准备播放
    update_test_state("playback", 0.0, 0, "录音完成！点击播放按钮听录音效果");
    
    Ok(())
}

// 更新测试状态的辅助函数
fn update_test_state(phase: &str, volume: f32, countdown: i32, message: &str) {
    if let Ok(mut state) = MIC_TEST_STATE.lock() {
        *state = Some(MicTestState {
            phase: phase.to_string(),
            volume_level: volume,
            countdown,
            message: message.to_string(),
        });
    }
}

// 播放音频数据的函数
fn play_audio_data(host: &cpal::Host, audio_data: RecordedAudio) -> Result<(), String> {
    use cpal::traits::StreamTrait;
    use std::sync::{Arc, Mutex};
    use std::thread;
    use std::time::Duration;
    
    // 获取默认输出设备
    let device = host.default_output_device()
        .ok_or("No output device available")?;
    
    // 获取设备配置
    let supported_configs = device.supported_output_configs()
        .map_err(|e| format!("Failed to get supported configs: {}", e))?
        .collect::<Vec<_>>();
    
    let config = supported_configs.first()
        .ok_or("No supported configurations")?;
    
    let stream_config = config.with_sample_rate(cpal::SampleRate(audio_data.sample_rate)).config();
    let sample_format = config.sample_format();
    let channels = stream_config.channels as usize;
    
    // 音频数据索引
    let audio_index = Arc::new(Mutex::new(0usize));
    let audio_data_arc = Arc::new(audio_data.data);
    let audio_index_clone = audio_index.clone();
    let audio_data_clone = audio_data_arc.clone();
    
    // 创建播放流
    let stream = match sample_format {
        cpal::SampleFormat::F32 => {
            device.build_output_stream(
                &stream_config,
                move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
                    if let Ok(mut index) = audio_index_clone.lock() {
                        for frame in data.chunks_mut(channels) {
                            if *index < audio_data_clone.len() {
                                let sample = audio_data_clone[*index];
                                for output_sample in frame.iter_mut() {
                                    *output_sample = sample;
                                }
                                *index += 1;
                            } else {
                                // 音频播放完毕，填充静音
                                for output_sample in frame.iter_mut() {
                                    *output_sample = 0.0;
                                }
                            }
                        }
                    }
                },
                |err| eprintln!("Audio stream error: {}", err),
                None,
            )
        }
        cpal::SampleFormat::I16 => {
            device.build_output_stream(
                &stream_config,
                move |data: &mut [i16], _: &cpal::OutputCallbackInfo| {
                    if let Ok(mut index) = audio_index_clone.lock() {
                        for frame in data.chunks_mut(channels) {
                            if *index < audio_data_clone.len() {
                                let sample = (audio_data_clone[*index] * 32767.0) as i16;
                                for output_sample in frame.iter_mut() {
                                    *output_sample = sample;
                                }
                                *index += 1;
                            } else {
                                // 音频播放完毕，填充静音
                                for output_sample in frame.iter_mut() {
                                    *output_sample = 0;
                                }
                            }
                        }
                    }
                },
                |err| eprintln!("Audio stream error: {}", err),
                None,
            )
        }
        _ => return Err(format!("Unsupported sample format: {:?}", sample_format)),
    };
    
    let stream = stream.map_err(|e| format!("Failed to build stream: {}", e))?;
    stream.play().map_err(|e| format!("Failed to start stream: {}", e))?;
    
    // 计算播放时长
    let duration_secs = audio_data_arc.len() as f32 / audio_data.sample_rate as f32;
    let duration = Duration::from_secs_f32(duration_secs + 0.5); // 额外0.5秒缓冲
    
    thread::sleep(duration);
    
    drop(stream);
    
    // 更新状态为完成
    update_test_state("completed", 0.0, 0, "播放完成！测试结束");
    
    Ok(())
}

#[command]
pub async fn set_global_audio_device(device_id: String, device_type: String) -> Result<(), String> {
    unsafe {
        if device_type == "input" {
            GLOBAL_INPUT_DEVICE = Some(device_id);
        } else if device_type == "output" {
            GLOBAL_OUTPUT_DEVICE = Some(device_id);
        } else {
            return Err("Invalid device type".to_string());
        }
    }
    Ok(())
}

#[command]
pub async fn get_global_audio_device(device_type: String) -> Result<Option<String>, String> {
    unsafe {
        Ok(if device_type == "input" {
            GLOBAL_INPUT_DEVICE.clone()
        } else if device_type == "output" {
            GLOBAL_OUTPUT_DEVICE.clone()
        } else {
            return Err("Invalid device type".to_string());
        })
    }
}