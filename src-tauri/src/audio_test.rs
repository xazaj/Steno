use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{SampleRate};
use std::thread;
use std::time::Duration;

fn main() {
    println!("开始录音测试...");
    
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
            return;
        }
    }
    
    // 获取默认输入设备
    let device = match host.default_input_device() {
        Some(device) => {
            if let Ok(name) = device.name() {
                println!("Using default input device: {}", name);
            }
            device
        }
        None => {
            eprintln!("No input device available");
            return;
        }
    };
    
    // 检查设备支持的配置
    let supported_configs = match device.supported_input_configs() {
        Ok(configs) => configs.collect::<Vec<_>>(),
        Err(e) => {
            eprintln!("Failed to get supported configs: {}", e);
            return;
        }
    };
    
    println!("Supported input configurations:");
    for (i, config) in supported_configs.iter().enumerate() {
        println!("  {}: {:?}", i, config);
    }
    
    // 查找最佳配置
    let (stream_config, sample_format) = if let Some(config) = supported_configs.iter()
        .find(|c| c.channels() >= 1 && c.min_sample_rate() <= SampleRate(16000) && c.max_sample_rate() >= SampleRate(16000)) {
        let config_range = config.clone();
        let stream_config = config_range.with_sample_rate(SampleRate(16000)).config();
        (stream_config, config_range.sample_format())
    } else if let Some(config) = supported_configs.first() {
        println!("Using first available config instead of 16kHz");
        let config_range = config.clone();
        let stream_config = config_range.with_max_sample_rate().config();
        (stream_config, config_range.sample_format())
    } else {
        eprintln!("No supported input configurations found");
        return;
    };
    
    println!("Selected config: channels={}, sample_rate={:?}, sample_format={:?}", 
            stream_config.channels, stream_config.sample_rate, sample_format);
    
    // 创建音频流
    let stream = match sample_format {
        cpal::SampleFormat::F32 => {
            device.build_input_stream(
                &stream_config,
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    let level = data.iter().map(|&sample| sample.abs()).sum::<f32>() / data.len() as f32;
                    if level > 0.01 {
                        println!("Audio level: {:.3}", level);
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
                    if level > 0.01 {
                        println!("Audio level: {:.3}", level);
                    }
                },
                |err| eprintln!("Audio stream error: {}", err),
                None,
            )
        }
        _ => {
            eprintln!("Unsupported sample format: {:?}", sample_format);
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
            return;
        }
    };
    
    if let Err(e) = stream.play() {
        eprintln!("Failed to start audio stream: {}", e);
        return;
    }
    
    println!("录音开始，请说话测试... (10秒后自动停止)");
    thread::sleep(Duration::from_secs(10));
    
    drop(stream);
    println!("录音测试结束");
}