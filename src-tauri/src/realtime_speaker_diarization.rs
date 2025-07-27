use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpeakerProfile {
    pub id: String,
    pub name: String,
    pub fundamental_freq: f32,
    pub formant_frequencies: Vec<f32>,
    pub spectral_centroid: f32,
    pub confidence: f32,
    pub sample_count: u32,
}

#[derive(Debug, Clone)]
pub struct VoiceFeatures {
    pub fundamental_freq: f32,
    pub formant_frequencies: Vec<f32>,
    pub spectral_centroid: f32,
    pub spectral_bandwidth: f32,
    pub zero_crossing_rate: f32,
    pub energy: f32,
    pub mfcc_features: Vec<f32>,
}

#[derive(Debug)]
pub struct RealtimeSpeakerDiarization {
    speaker_profiles: HashMap<String, SpeakerProfile>,
    current_speaker: Option<String>,
    feature_history: Vec<VoiceFeatures>,
    max_history: usize,
}

impl RealtimeSpeakerDiarization {
    pub fn new() -> Self {
        Self {
            speaker_profiles: HashMap::new(),
            current_speaker: None,
            feature_history: Vec::new(),
            max_history: 10, // 保留最近10个特征用于说话人识别
        }
    }

    pub fn identify_speaker(&mut self, audio: &[f32]) -> Option<String> {
        // 提取音色特征
        let features = match self.extract_voice_features(audio) {
            Ok(f) => f,
            Err(_) => return None,
        };

        // 添加到历史记录
        self.feature_history.push(features.clone());
        if self.feature_history.len() > self.max_history {
            self.feature_history.remove(0);
        }

        // 如果没有已知说话人，创建第一个
        if self.speaker_profiles.is_empty() {
            let speaker_id = "Speaker_1".to_string();
            let profile = SpeakerProfile {
                id: speaker_id.clone(),
                name: "说话人A".to_string(),
                fundamental_freq: features.fundamental_freq,
                formant_frequencies: features.formant_frequencies.clone(),
                spectral_centroid: features.spectral_centroid,
                confidence: 1.0,
                sample_count: 1,
            };
            self.speaker_profiles.insert(speaker_id.clone(), profile);
            self.current_speaker = Some(speaker_id.clone());
            return Some("说话人A".to_string());
        }

        // 计算与已知说话人的相似度
        let mut best_match = None;
        let mut best_similarity = 0.0;

        for (speaker_id, profile) in &self.speaker_profiles {
            let similarity = self.calculate_speaker_similarity(&features, profile);
            if similarity > best_similarity {
                best_similarity = similarity;
                best_match = Some(speaker_id.clone());
            }
        }

        const SIMILARITY_THRESHOLD: f32 = 0.7;

        if let Some(speaker_id) = best_match {
            if best_similarity > SIMILARITY_THRESHOLD {
                // 更新说话人特征
                self.update_speaker_profile(&speaker_id, &features);
                let profile = self.speaker_profiles.get(&speaker_id).unwrap();
                self.current_speaker = Some(speaker_id);
                return Some(profile.name.clone());
            }
        }

        // 创建新说话人
        let speaker_count = self.speaker_profiles.len();
        let speaker_id = format!("Speaker_{}", speaker_count + 1);
        let speaker_names = ["说话人A", "说话人B", "说话人C", "说话人D"];
        let speaker_name = speaker_names.get(speaker_count)
            .unwrap_or(&"说话人X")
            .to_string();

        let profile = SpeakerProfile {
            id: speaker_id.clone(),
            name: speaker_name.clone(),
            fundamental_freq: features.fundamental_freq,
            formant_frequencies: features.formant_frequencies.clone(),
            spectral_centroid: features.spectral_centroid,
            confidence: 1.0,
            sample_count: 1,
        };

        self.speaker_profiles.insert(speaker_id.clone(), profile);
        self.current_speaker = Some(speaker_id);
        Some(speaker_name)
    }

    fn extract_voice_features(&self, audio: &[f32]) -> Result<VoiceFeatures, String> {
        if audio.len() < 1600 { // 至少100ms
            return Err("Audio segment too short".to_string());
        }

        // 1. 基频提取
        let fundamental_freq = self.estimate_fundamental_frequency(audio);

        // 2. 共振峰频率
        let formant_frequencies = self.estimate_formant_frequencies(audio);

        // 3. 频谱质心和带宽
        let (spectral_centroid, spectral_bandwidth) = self.calculate_spectral_features(audio);

        // 4. 过零率
        let zero_crossing_rate = self.calculate_zero_crossing_rate(audio);

        // 5. 能量
        let energy = audio.iter().map(|&x| x * x).sum::<f32>() / audio.len() as f32;

        // 6. 简化的MFCC特征
        let mfcc_features = self.extract_mfcc_features(audio);

        Ok(VoiceFeatures {
            fundamental_freq,
            formant_frequencies,
            spectral_centroid,
            spectral_bandwidth,
            zero_crossing_rate,
            energy,
            mfcc_features,
        })
    }

    fn estimate_fundamental_frequency(&self, audio: &[f32]) -> f32 {
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

    fn estimate_formant_frequencies(&self, audio: &[f32]) -> Vec<f32> {
        // 简化的线性预测编码 (LPC) 方法估计共振峰
        let lpc_order = 12;
        let lpc_coeffs = self.compute_lpc_coefficients(audio, lpc_order);
        self.find_formants_from_lpc(&lpc_coeffs)
    }

    fn compute_lpc_coefficients(&self, audio: &[f32], order: usize) -> Vec<f32> {
        // 简化的Levinson-Durbin算法
        let mut autocorr = vec![0.0; order + 1];
        
        // 计算自相关函数
        for lag in 0..=order {
            for i in lag..audio.len() {
                autocorr[lag] += audio[i] * audio[i - lag];
            }
        }
        
        if autocorr[0] == 0.0 {
            return vec![0.0; order];
        }
        
        let mut lpc = vec![0.0; order];
        let mut error = autocorr[0];
        
        for i in 0..order {
            let mut reflection_coeff = autocorr[i + 1];
            for j in 0..i {
                reflection_coeff -= lpc[j] * autocorr[i - j];
            }
            reflection_coeff /= error;
            
            lpc[i] = reflection_coeff;
            
            for j in 0..i {
                lpc[j] -= reflection_coeff * lpc[i - 1 - j];
            }
            
            error *= 1.0 - reflection_coeff * reflection_coeff;
        }
        
        lpc
    }

    fn find_formants_from_lpc(&self, lpc_coeffs: &[f32]) -> Vec<f32> {
        // 从LPC系数中寻找共振峰（简化方法）
        let mut formants = Vec::new();
        let sample_rate = 16000.0;
        
        // 计算LPC频率响应并寻找峰值
        let n_points = 512;
        let mut magnitudes = Vec::new();
        
        for k in 0..n_points {
            let freq = k as f32 * sample_rate / (2.0 * n_points as f32);
            let omega = 2.0 * std::f32::consts::PI * freq / sample_rate;
            
            let mut real_part = 1.0;
            let mut imag_part = 0.0;
            
            for (i, &coeff) in lpc_coeffs.iter().enumerate() {
                let angle = (i + 1) as f32 * omega;
                real_part -= coeff * angle.cos();
                imag_part -= coeff * angle.sin();
            }
            
            let magnitude = 1.0 / (real_part * real_part + imag_part * imag_part).sqrt();
            magnitudes.push((freq, magnitude));
        }
        
        // 寻找前3个峰值作为共振峰
        let mut peaks: Vec<(f32, f32)> = Vec::new();
        for i in 1..magnitudes.len() - 1 {
            if magnitudes[i].1 > magnitudes[i - 1].1 && magnitudes[i].1 > magnitudes[i + 1].1 {
                let freq = magnitudes[i].0;
                if freq > 200.0 && freq < 4000.0 { // 语音共振峰范围
                    peaks.push((freq, magnitudes[i].1));
                }
            }
        }
        
        // 按幅度排序，取前3个
        peaks.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        for (freq, _) in peaks.iter().take(3) {
            formants.push(*freq);
        }
        
        // 确保至少有3个共振峰
        while formants.len() < 3 {
            formants.push(0.0);
        }
        
        formants
    }

    fn calculate_spectral_features(&self, audio: &[f32]) -> (f32, f32) {
        let chunk_size = 512;
        let mut magnitudes = Vec::new();
        
        for chunk in audio.chunks(chunk_size) {
            if chunk.len() == chunk_size {
                let magnitude_sum: f32 = chunk.iter().map(|&x| x.abs()).sum();
                magnitudes.push(magnitude_sum / chunk_size as f32);
            }
        }
        
        if magnitudes.is_empty() {
            return (0.0, 0.0);
        }
        
        // 计算质心
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
        
        // 计算带宽
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

    fn calculate_zero_crossing_rate(&self, audio: &[f32]) -> f32 {
        if audio.len() < 2 {
            return 0.0;
        }
        
        let zero_crossings = audio.windows(2)
            .filter(|window| (window[0] >= 0.0) != (window[1] >= 0.0))
            .count();
        
        zero_crossings as f32 / (audio.len() - 1) as f32
    }

    fn extract_mfcc_features(&self, audio: &[f32]) -> Vec<f32> {
        // 返回简化的12维MFCC特征向量
        let mut mfcc = vec![0.0; 12];
        
        // 简化的梅尔滤波器组处理
        let mel_banks = 12;
        let frame_size = 512;
        
        for (bank, mfcc_val) in mfcc.iter_mut().enumerate() {
            let mut bank_energy = 0.0;
            let mut sample_count = 0;
            
            for chunk in audio.chunks(frame_size) {
                if chunk.len() == frame_size {
                    // 简化的梅尔能量计算
                    let start_idx = bank * chunk.len() / mel_banks;
                    let end_idx = ((bank + 1) * chunk.len() / mel_banks).min(chunk.len());
                    
                    for &sample in &chunk[start_idx..end_idx] {
                        bank_energy += sample * sample;
                        sample_count += 1;
                    }
                }
            }
            
            if sample_count > 0 {
                *mfcc_val = (bank_energy / sample_count as f32 + 1e-10).ln();
            }
        }
        
        mfcc
    }

    fn calculate_speaker_similarity(&self, features: &VoiceFeatures, profile: &SpeakerProfile) -> f32 {
        let mut similarity = 0.0;
        let mut weight_sum = 0.0;

        // 基频相似度 (权重: 0.3)
        if features.fundamental_freq > 0.0 && profile.fundamental_freq > 0.0 {
            let freq_diff = (features.fundamental_freq - profile.fundamental_freq).abs();
            let freq_sim = 1.0 - (freq_diff / (features.fundamental_freq + profile.fundamental_freq) * 2.0).min(1.0);
            similarity += freq_sim * 0.3;
            weight_sum += 0.3;
        }

        // 频谱质心相似度 (权重: 0.2)
        if features.spectral_centroid > 0.0 && profile.spectral_centroid > 0.0 {
            let centroid_diff = (features.spectral_centroid - profile.spectral_centroid).abs();
            let centroid_sim = 1.0 - (centroid_diff / (features.spectral_centroid + profile.spectral_centroid) * 2.0).min(1.0);
            similarity += centroid_sim * 0.2;
            weight_sum += 0.2;
        }

        // 共振峰相似度 (权重: 0.3)
        let mut formant_similarity = 0.0;
        let formant_count = features.formant_frequencies.len().min(profile.formant_frequencies.len());
        if formant_count > 0 {
            for i in 0..formant_count {
                if features.formant_frequencies[i] > 0.0 && profile.formant_frequencies[i] > 0.0 {
                    let formant_diff = (features.formant_frequencies[i] - profile.formant_frequencies[i]).abs();
                    let formant_sim = 1.0 - (formant_diff / (features.formant_frequencies[i] + profile.formant_frequencies[i]) * 2.0).min(1.0);
                    formant_similarity += formant_sim;
                }
            }
            formant_similarity /= formant_count as f32;
            similarity += formant_similarity * 0.3;
            weight_sum += 0.3;
        }

        // MFCC相似度 (权重: 0.2)
        let mfcc_count = features.mfcc_features.len().min(12);
        if mfcc_count > 0 {
            let mut mfcc_distance = 0.0;
            for i in 0..mfcc_count {
                let diff = features.mfcc_features[i] - 0.0; // 与默认值比较
                mfcc_distance += diff * diff;
            }
            let mfcc_sim = 1.0 / (1.0 + mfcc_distance.sqrt());
            similarity += mfcc_sim * 0.2;
            weight_sum += 0.2;
        }

        if weight_sum > 0.0 {
            similarity / weight_sum
        } else {
            0.0
        }
    }

    fn update_speaker_profile(&mut self, speaker_id: &str, features: &VoiceFeatures) {
        if let Some(profile) = self.speaker_profiles.get_mut(speaker_id) {
            let alpha = 0.1; // 学习率
            
            // 更新基频 (指数移动平均)
            if features.fundamental_freq > 0.0 {
                profile.fundamental_freq = profile.fundamental_freq * (1.0 - alpha) + features.fundamental_freq * alpha;
            }
            
            // 更新频谱质心
            if features.spectral_centroid > 0.0 {
                profile.spectral_centroid = profile.spectral_centroid * (1.0 - alpha) + features.spectral_centroid * alpha;
            }
            
            // 更新共振峰
            for i in 0..profile.formant_frequencies.len().min(features.formant_frequencies.len()) {
                if features.formant_frequencies[i] > 0.0 {
                    profile.formant_frequencies[i] = profile.formant_frequencies[i] * (1.0 - alpha) + features.formant_frequencies[i] * alpha;
                }
            }
            
            profile.sample_count += 1;
            
            // 更新置信度
            profile.confidence = (profile.confidence * 0.9 + 0.1).min(1.0);
        }
    }

    pub fn get_speaker_count(&self) -> usize {
        self.speaker_profiles.len()
    }

    pub fn get_current_speaker(&self) -> Option<String> {
        if let Some(speaker_id) = &self.current_speaker {
            self.speaker_profiles.get(speaker_id).map(|profile| profile.name.clone())
        } else {
            None
        }
    }

    pub fn get_speaker_profiles(&self) -> Vec<SpeakerProfile> {
        self.speaker_profiles.values().cloned().collect()
    }
}