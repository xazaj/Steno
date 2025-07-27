// 说话人识别辅助函数
use std::collections::HashMap;

// 估计基频 (简化的自相关方法)
pub fn estimate_fundamental_frequency(audio: &[f32]) -> f32 {
    let sample_rate = 16000.0;
    let min_period = (sample_rate / 500.0) as usize; // 最高500Hz
    let max_period = (sample_rate / 50.0) as usize;  // 最低50Hz
    
    let mut max_correlation = 0.0;
    let mut best_period = min_period;
    
    for period in min_period..=max_period.min(audio.len() / 2) {
        let mut correlation = 0.0;
        let mut count = 0;
        
        for i in 0..(audio.len() - period) {
            correlation += audio[i] * audio[i + period];
            count += 1;
        }
        
        if count > 0 {
            correlation /= count as f32;
            if correlation > max_correlation {
                max_correlation = correlation;
                best_period = period;
            }
        }
    }
    
    sample_rate / best_period as f32
}

// 计算频谱特征
pub fn calculate_spectral_features(audio: &[f32]) -> (f32, f32) {
    // 简化的频域分析
    let mut magnitudes = Vec::new();
    let chunk_size = 512;
    
    for chunk in audio.chunks(chunk_size) {
        if chunk.len() == chunk_size {
            let magnitude_sum: f32 = chunk.iter().map(|&x| x.abs()).sum();
            magnitudes.push(magnitude_sum / chunk_size as f32);
        }
    }
    
    if magnitudes.is_empty() {
        return (0.0, 0.0);
    }
    
    // 计算质心 (频率的加权平均)
    let mut weighted_sum = 0.0;
    let mut total_magnitude = 0.0;
    
    for (i, &magnitude) in magnitudes.iter().enumerate() {
        let frequency = i as f32 * 16000.0 / magnitudes.len() as f32;
        weighted_sum += frequency * magnitude;
        total_magnitude += magnitude;
    }
    
    let centroid = if total_magnitude > 0.0 {
        weighted_sum / total_magnitude
    } else {
        0.0
    };
    
    // 计算带宽 (频率分布的标准差)
    let mut variance = 0.0;
    for (i, &magnitude) in magnitudes.iter().enumerate() {
        let frequency = i as f32 * 16000.0 / magnitudes.len() as f32;
        variance += (frequency - centroid).powi(2) * magnitude;
    }
    
    let bandwidth = if total_magnitude > 0.0 {
        (variance / total_magnitude).sqrt()
    } else {
        0.0
    };
    
    (centroid, bandwidth)
}

// 计算过零率
pub fn calculate_zero_crossing_rate(audio: &[f32]) -> f32 {
    if audio.len() < 2 {
        return 0.0;
    }
    
    let zero_crossings = audio.windows(2)
        .filter(|window| (window[0] >= 0.0) != (window[1] >= 0.0))
        .count();
    
    zero_crossings as f32 / (audio.len() - 1) as f32
}

// 提取MFCC特征 (简化版本)
pub fn extract_mfcc_features(audio: &[f32]) -> Result<Vec<f32>, String> {
    let frame_size = 512;
    let num_mfcc = 13; // 标准MFCC特征数量
    let mut mfcc_features = vec![0.0; num_mfcc];
    
    // 简化的梅尔滤波器组
    let mel_filters = create_mel_filterbank(frame_size / 2, num_mfcc);
    
    // 对音频进行分帧处理
    let mut feature_sum = vec![0.0; num_mfcc];
    let mut frame_count = 0;
    
    for chunk in audio.chunks(frame_size) {
        if chunk.len() == frame_size {
            // 应用汉宁窗
            let windowed: Vec<f32> = chunk.iter()
                .enumerate()
                .map(|(i, &x)| {
                    let window_val = 0.5 * (1.0 - (2.0 * std::f32::consts::PI * i as f32 / (frame_size - 1) as f32).cos());
                    x * window_val
                })
                .collect();
            
            // 计算功率谱
            let power_spectrum = calculate_power_spectrum(&windowed);
            
            // 应用梅尔滤波器
            for (i, filter) in mel_filters.iter().enumerate() {
                let mut mel_energy = 0.0;
                for (j, &power) in power_spectrum.iter().enumerate() {
                    if j < filter.len() {
                        mel_energy += power * filter[j];
                    }
                }
                
                // 对数变换
                feature_sum[i] += (mel_energy + 1e-10).ln();
            }
            
            frame_count += 1;
        }
    }
    
    // 平均化特征
    if frame_count > 0 {
        for i in 0..num_mfcc {
            mfcc_features[i] = feature_sum[i] / frame_count as f32;
        }
    }
    
    Ok(mfcc_features)
}

// 创建简化的梅尔滤波器组
pub fn create_mel_filterbank(spectrum_size: usize, num_filters: usize) -> Vec<Vec<f32>> {
    let mut filterbank = Vec::new();
    
    for i in 0..num_filters {
        let mut filter = vec![0.0; spectrum_size];
        
        // 简化的三角滤波器
        let center = (i + 1) * spectrum_size / (num_filters + 1);
        let width = spectrum_size / (num_filters + 1);
        
        for j in 0..spectrum_size {
            if j >= center.saturating_sub(width) && j <= center + width {
                let distance = (j as i32 - center as i32).abs() as f32;
                filter[j] = (1.0 - distance / width as f32).max(0.0);
            }
        }
        
        filterbank.push(filter);
    }
    
    filterbank
}

// 计算功率谱
pub fn calculate_power_spectrum(windowed_frame: &[f32]) -> Vec<f32> {
    let mut power_spectrum = Vec::new();
    let n = windowed_frame.len();
    
    // 简化的功率谱计算
    for k in 0..n/2 {
        let mut real_part = 0.0;
        let mut imag_part = 0.0;
        
        for (i, &sample) in windowed_frame.iter().enumerate() {
            let angle = -2.0 * std::f32::consts::PI * k as f32 * i as f32 / n as f32;
            real_part += sample * angle.cos();
            imag_part += sample * angle.sin();
        }
        
        let power = real_part * real_part + imag_part * imag_part;
        power_spectrum.push(power);
    }
    
    power_spectrum
}

// 估计共振峰频率
pub fn estimate_formant_frequencies(audio: &[f32]) -> Vec<f32> {
    let power_spectrum = calculate_power_spectrum(audio);
    let mut formants = Vec::new();
    
    // 寻找功率谱中的峰值作为共振峰
    let mut peaks = Vec::new();
    for i in 1..power_spectrum.len()-1 {
        if power_spectrum[i] > power_spectrum[i-1] && power_spectrum[i] > power_spectrum[i+1] {
            let frequency = i as f32 * 16000.0 / (2 * power_spectrum.len()) as f32;
            if frequency > 200.0 && frequency < 4000.0 { // 语音共振峰范围
                peaks.push((frequency, power_spectrum[i]));
            }
        }
    }
    
    // 按功率排序，取前3个作为主要共振峰
    peaks.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
    for (freq, _) in peaks.iter().take(3) {
        formants.push(*freq);
    }
    
    // 如果共振峰不足，用默认值填充
    while formants.len() < 3 {
        formants.push(0.0);
    }
    
    formants
}