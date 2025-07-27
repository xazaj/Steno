// realtime_whisper.rs - 真实的实时 Whisper.cpp 集成
use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};

// FFI 绑定 - 来自 lib.rs 的 whisper.cpp 绑定
use crate::{
    whisper_context, whisper_full, whisper_full_default_params, 
    whisper_full_n_segments, whisper_full_get_segment_text,
    whisper_sampling_strategy_WHISPER_SAMPLING_GREEDY,
    whisper_sampling_strategy_WHISPER_SAMPLING_BEAM_SEARCH,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealtimeRecognitionConfig {
    pub language: String,
    pub mode: String, // "streaming", "buffered", "hybrid"
    pub speaker_diarization: bool,
    pub noise_reduction: bool,
    pub beam_size: i32,
    pub temperature: f32,
    pub max_tokens: i32,
    pub initial_prompt: Option<String>,
}

impl Default for RealtimeRecognitionConfig {
    fn default() -> Self {
        Self {
            language: "zh".to_string(),
            mode: "hybrid".to_string(),
            speaker_diarization: true,
            noise_reduction: true,
            beam_size: 2, // 实时处理使用较小的beam size
            temperature: 0.0,
            max_tokens: 50, // 限制单次识别的最大token数
            initial_prompt: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealtimeRecognitionResult {
    pub text: String,
    pub confidence: f32,
    pub is_temporary: bool,
    pub speaker: Option<String>,
    pub timestamp: u64,
    pub processing_time_ms: u64,
}

/// 实时 Whisper 识别器
pub struct RealtimeWhisperRecognizer {
    context: Arc<Mutex<*mut whisper_context>>,
    config: RealtimeRecognitionConfig,
    segment_counter: Arc<Mutex<u32>>,
}

unsafe impl Send for RealtimeWhisperRecognizer {}
unsafe impl Sync for RealtimeWhisperRecognizer {}

impl RealtimeWhisperRecognizer {
    /// 创建新的实时识别器
    pub fn new(whisper_context: *mut whisper_context, config: RealtimeRecognitionConfig) -> Self {
        Self {
            context: Arc::new(Mutex::new(whisper_context)),
            config,
            segment_counter: Arc::new(Mutex::new(0)),
        }
    }

    /// 处理音频块并返回识别结果
    pub fn process_audio_chunk(&self, audio: &[f32]) -> Result<RealtimeRecognitionResult, String> {
        let start_time = std::time::Instant::now();
        
        // 1. 音频质量检查
        if audio.len() < 1600 { // 100ms at 16kHz
            return Err("Audio chunk too short".to_string());
        }

        // 2. VAD - 语音活动检测
        let energy = audio.iter().map(|&x| x * x).sum::<f32>() / audio.len() as f32;
        let rms = energy.sqrt();
        
        if rms < 0.005 {
            return Err("Silent segment detected".to_string());
        }

        // 3. 音频预处理
        let mut processed_audio = self.preprocess_audio(audio);

        // 4. 调用 Whisper.cpp 进行识别
        let recognition_text = self.whisper_recognize(&mut processed_audio)?;

        // 5. 后处理识别结果
        let processed_text = self.post_process_text(&recognition_text);

        // 6. 计算识别结果的属性
        let segment_id = {
            let mut counter = self.segment_counter.lock().unwrap();
            *counter += 1;
            *counter
        };

        let is_temporary = match self.config.mode.as_str() {
            "streaming" => false,
            "buffered" => false, 
            "hybrid" => segment_id % 3 != 0, // 每3次输出1次最终结果
            _ => false,
        };

        let confidence = self.calculate_confidence(&processed_text, rms);
        let speaker = if self.config.speaker_diarization {
            self.detect_speaker(&processed_audio)
        } else {
            None
        };

        let processing_time = start_time.elapsed().as_millis() as u64;

        Ok(RealtimeRecognitionResult {
            text: processed_text,
            confidence,
            is_temporary,
            speaker,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            processing_time_ms: processing_time,
        })
    }

    /// 音频预处理
    fn preprocess_audio(&self, audio: &[f32]) -> Vec<f32> {
        let mut processed = audio.to_vec();

        // 1. 预加重滤波
        self.apply_preemphasis(&mut processed, 0.97);

        // 2. 归一化
        self.normalize_audio(&mut processed);

        // 3. 噪声抑制（如果启用）
        if self.config.noise_reduction {
            self.apply_noise_reduction(&mut processed);
        }

        processed
    }

    /// 真实的 Whisper.cpp 识别调用
    fn whisper_recognize(&self, audio: &mut [f32]) -> Result<String, String> {
        let ctx_guard = self.context.lock().unwrap();
        let ctx = *ctx_guard;

        unsafe {
            // 设置识别参数 - 针对实时处理优化
            let mut params = if self.config.beam_size > 1 {
                whisper_full_default_params(whisper_sampling_strategy_WHISPER_SAMPLING_BEAM_SEARCH)
            } else {
                whisper_full_default_params(whisper_sampling_strategy_WHISPER_SAMPLING_GREEDY)
            };

            // 实时处理优化参数
            params.n_threads = 2; // 使用较少线程减少延迟
            params.greedy.best_of = 1; // 减少候选数量
            params.temperature = self.config.temperature;
            params.suppress_blank = true;
            params.token_timestamps = false; // 实时处理不需要详细时间戳
            params.max_len = self.config.max_tokens;
            params.print_realtime = false;
            params.print_progress = false;

            // 设置beam search参数
            if self.config.beam_size > 1 {
                params.beam_search.beam_size = self.config.beam_size;
                params.beam_search.patience = 1.0;
            }

            // 设置语言
            let lang_cstring = if self.config.language != "auto" {
                let lang_str = match self.config.language.as_str() {
                    "zh" => "zh",
                    "en" => "en", 
                    _ => "zh",
                };
                Some(CString::new(lang_str).unwrap())
            } else {
                None
            };

            if let Some(ref lang_str) = lang_cstring {
                params.language = lang_str.as_ptr();
            }

            // 设置初始提示词
            let prompt_cstring = if let Some(ref prompt) = self.config.initial_prompt {
                if !prompt.trim().is_empty() {
                    Some(CString::new(prompt.trim()).unwrap())
                } else {
                    None
                }
            } else {
                None
            };

            if let Some(ref prompt_str) = prompt_cstring {
                params.initial_prompt = prompt_str.as_ptr();
            }

            // 执行识别
            let result = whisper_full(
                ctx,
                params,
                audio.as_mut_ptr(),
                audio.len() as i32,
            );

            if result != 0 {
                return Err(format!("Whisper recognition failed with code: {}", result));
            }

            // 提取识别文本
            let num_segments = whisper_full_n_segments(ctx);
            let mut full_text = String::new();

            for i in 0..num_segments {
                let segment_ptr = whisper_full_get_segment_text(ctx, i);
                if !segment_ptr.is_null() {
                    let c_str = CStr::from_ptr(segment_ptr as *const c_char);
                    if let Ok(text) = c_str.to_str() {
                        full_text.push_str(text);
                    }
                }
            }

            Ok(full_text)
        }
    }

    /// 文本后处理
    fn post_process_text(&self, text: &str) -> String {
        let mut processed = text.trim().to_string();

        // 移除重复的空格
        processed = processed.split_whitespace().collect::<Vec<_>>().join(" ");

        // 语言特定的后处理
        match self.config.language.as_str() {
            "zh" => self.post_process_chinese(&processed),
            "en" => self.post_process_english(&processed),
            _ => processed,
        }
    }

    /// 中文文本后处理
    fn post_process_chinese(&self, text: &str) -> String {
        let mut result = text.to_string();
        
        // 移除常见的识别错误
        let common_fixes = vec![
            ("的的", "的"),
            ("了了", "了"),
            ("是是", "是"),
            ("在在", "在"),
            ("我我", "我"),
            ("你你", "你"),
            ("他他", "他"),
            ("她她", "她"),
        ];

        for (wrong, correct) in common_fixes {
            result = result.replace(wrong, correct);
        }

        result
    }

    /// 英文文本后处理
    fn post_process_english(&self, text: &str) -> String {
        let mut result = text.to_string();
        
        // 英文特定的后处理
        let common_fixes = vec![
            ("  ", " "),
            (" .", "."),
            (" ,", ","),
            (" !", "!"),
            (" ?", "?"),
        ];

        for (wrong, correct) in common_fixes {
            result = result.replace(wrong, correct);
        }

        result
    }

    /// 音频预处理辅助函数
    fn apply_preemphasis(&self, samples: &mut [f32], coeff: f32) {
        if samples.len() < 2 {
            return;
        }
        for i in (1..samples.len()).rev() {
            samples[i] -= coeff * samples[i-1];
        }
    }

    fn normalize_audio(&self, samples: &mut [f32]) {
        if samples.is_empty() {
            return;
        }
        
        let max_abs = samples.iter()
            .map(|&x| x.abs())
            .fold(0.0f32, f32::max);
        
        if max_abs > 0.0 && max_abs != 1.0 {
            let scale = 0.95 / max_abs;
            for sample in samples.iter_mut() {
                *sample *= scale;
            }
        }
    }

    fn apply_noise_reduction(&self, samples: &mut [f32]) {
        let energy = samples.iter().map(|&x| x * x).sum::<f32>() / samples.len() as f32;
        let noise_threshold = energy * 0.3;
        
        for sample in samples.iter_mut() {
            let sample_energy = *sample * *sample;
            if sample_energy < noise_threshold {
                *sample *= 0.5;
            }
        }
    }

    /// 置信度计算
    fn calculate_confidence(&self, text: &str, audio_rms: f32) -> f32 {
        let base_confidence = 0.8;
        
        // 基于音频质量的调整
        let audio_quality_bonus = (audio_rms * 30.0).min(0.15);
        
        // 基于文本长度的调整
        let text_length_bonus = match text.len() {
            0..=2 => 0.0,
            3..=5 => 0.05,
            _ => 0.1,
        };

        // 基于文本内容质量的调整
        let content_quality_bonus = if text.chars().any(|c| c.is_alphabetic() || c.is_ascii_digit()) {
            0.05
        } else {
            0.0
        };
        
        (base_confidence + audio_quality_bonus + text_length_bonus + content_quality_bonus).min(0.98)
    }

    /// 简单的说话人检测
    fn detect_speaker(&self, audio: &[f32]) -> Option<String> {
        let avg_amplitude = audio.iter().map(|&x| x.abs()).sum::<f32>() / audio.len() as f32;
        let zero_crossing_rate = self.calculate_zero_crossing_rate(audio);
        
        // 基于音频特征的简单说话人分类
        if avg_amplitude > 0.02 && zero_crossing_rate > 0.1 {
            Some("Speaker A".to_string())
        } else if avg_amplitude > 0.01 {
            Some("Speaker B".to_string())
        } else {
            None
        }
    }

    /// 计算过零率
    fn calculate_zero_crossing_rate(&self, audio: &[f32]) -> f32 {
        let mut zero_crossings = 0;
        for i in 1..audio.len() {
            if (audio[i] > 0.0) != (audio[i-1] > 0.0) {
                zero_crossings += 1;
            }
        }
        zero_crossings as f32 / audio.len() as f32
    }

    /// 更新配置
    pub fn update_config(&mut self, config: RealtimeRecognitionConfig) {
        self.config = config;
    }

    /// 重置段计数器
    pub fn reset_segment_counter(&self) {
        let mut counter = self.segment_counter.lock().unwrap();
        *counter = 0;
    }
}