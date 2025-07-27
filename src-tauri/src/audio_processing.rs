// audio_processing.rs - 智能音频处理管道
use std::collections::VecDeque;
use std::time::{Duration, Instant};

/// 语音活动检测器
pub struct VoiceActivityDetector {
    energy_threshold: f32,
    zero_crossing_threshold: f32,
    history_window: VecDeque<f32>,
    speech_probability: f32,
}

impl VoiceActivityDetector {
    pub fn new() -> Self {
        Self {
            energy_threshold: 0.001,
            zero_crossing_threshold: 0.3,
            history_window: VecDeque::with_capacity(10),
            speech_probability: 0.0,
        }
    }

    pub fn is_speech(&mut self, audio: &[f32]) -> bool {
        let energy = self.calculate_energy(audio);
        let zcr = self.calculate_zero_crossing_rate(audio);
        
        // 多特征融合判断
        let energy_score = if energy > self.energy_threshold { 1.0 } else { 0.0 };
        let zcr_score = if zcr > self.zero_crossing_threshold { 1.0 } else { 0.0 };
        
        // 历史平滑
        self.history_window.push_back(energy_score * 0.7 + zcr_score * 0.3);
        if self.history_window.len() > 10 {
            self.history_window.pop_front();
        }
        
        self.speech_probability = self.history_window.iter().sum::<f32>() / self.history_window.len() as f32;
        
        self.speech_probability > 0.3
    }

    pub fn get_speech_probability(&self) -> f32 {
        self.speech_probability
    }

    pub fn detect_speech_boundary(&self, audio: &[f32]) -> SpeechBoundary {
        let energy = self.calculate_energy(audio);
        
        if energy < self.energy_threshold * 0.1 {
            SpeechBoundary::SilenceStart
        } else if energy > self.energy_threshold * 2.0 {
            SpeechBoundary::SpeechStart
        } else {
            SpeechBoundary::Continuing
        }
    }

    fn calculate_energy(&self, audio: &[f32]) -> f32 {
        audio.iter().map(|&x| x * x).sum::<f32>() / audio.len() as f32
    }

    fn calculate_zero_crossing_rate(&self, audio: &[f32]) -> f32 {
        let mut crossings = 0;
        for window in audio.windows(2) {
            if (window[0] >= 0.0) != (window[1] >= 0.0) {
                crossings += 1;
            }
        }
        crossings as f32 / (audio.len() - 1) as f32
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum SpeechBoundary {
    SpeechStart,
    SilenceStart, 
    Continuing,
}

/// 语音段信息
#[derive(Debug, Clone)]
pub struct SpeechSegment {
    pub audio_data: Vec<f32>,
    pub start_time: Instant,
    pub end_time: Option<Instant>,
    pub is_complete: bool,
    pub energy_level: f32,
}

impl SpeechSegment {
    pub fn new(audio_data: Vec<f32>) -> Self {
        let energy = audio_data.iter().map(|&x| x * x).sum::<f32>() / audio_data.len() as f32;
        
        Self {
            audio_data,
            start_time: Instant::now(),
            end_time: None,
            is_complete: false,
            energy_level: energy,
        }
    }

    pub fn add_audio(&mut self, audio: &[f32]) {
        self.audio_data.extend_from_slice(audio);
        self.energy_level = self.audio_data.iter().map(|&x| x * x).sum::<f32>() / self.audio_data.len() as f32;
    }

    pub fn complete(&mut self) {
        self.end_time = Some(Instant::now());
        self.is_complete = true;
    }

    pub fn duration(&self) -> Duration {
        if let Some(end) = self.end_time {
            end.duration_since(self.start_time)
        } else {
            Instant::now().duration_since(self.start_time)
        }
    }

    pub fn length_samples(&self) -> usize {
        self.audio_data.len()
    }

    pub fn length_seconds(&self) -> f32 {
        self.audio_data.len() as f32 / 16000.0
    }
}

/// 智能音频缓冲区
pub struct SmartAudioBuffer {
    current_segment: Option<SpeechSegment>,
    completed_segments: VecDeque<SpeechSegment>,
    vad: VoiceActivityDetector,
    silence_duration: Duration,
    last_speech_time: Option<Instant>,
    min_segment_duration: Duration,
    max_segment_duration: Duration,
}

impl SmartAudioBuffer {
    pub fn new() -> Self {
        Self {
            current_segment: None,
            completed_segments: VecDeque::new(),
            vad: VoiceActivityDetector::new(),
            silence_duration: Duration::from_millis(0),
            last_speech_time: None,
            min_segment_duration: Duration::from_millis(500),
            max_segment_duration: Duration::from_secs(10),
        }
    }

    pub fn add_chunk(&mut self, chunk: &[f32]) -> Vec<SpeechSegment> {
        let mut completed = Vec::new();
        let is_speech = self.vad.is_speech(chunk);
        let _boundary = self.vad.detect_speech_boundary(chunk);
        
        if is_speech {
            self.last_speech_time = Some(Instant::now());
            self.silence_duration = Duration::from_millis(0);
            
            // 开始新段或继续当前段
            match self.current_segment.as_mut() {
                Some(segment) => {
                    segment.add_audio(chunk);
                    
                    // 检查是否需要强制分割（过长）
                    if segment.duration() > self.max_segment_duration {
                        let mut finished = segment.clone();
                        finished.complete();
                        completed.push(finished);
                        
                        self.current_segment = Some(SpeechSegment::new(chunk.to_vec()));
                    }
                }
                None => {
                    self.current_segment = Some(SpeechSegment::new(chunk.to_vec()));
                }
            }
        } else {
            // 静音处理
            if let Some(last_speech) = self.last_speech_time {
                self.silence_duration = Instant::now().duration_since(last_speech);
            }
            
            // 如果静音持续足够长，结束当前段
            if self.silence_duration > Duration::from_millis(800) {
                if let Some(mut segment) = self.current_segment.take() {
                    if segment.duration() >= self.min_segment_duration {
                        segment.complete();
                        completed.push(segment);
                    }
                }
            } else if let Some(segment) = self.current_segment.as_mut() {
                // 短暂静音，仍然添加到当前段
                segment.add_audio(chunk);
            }
        }
        
        completed
    }

    pub fn get_current_segment(&self) -> Option<&SpeechSegment> {
        self.current_segment.as_ref()
    }

    pub fn force_complete_current(&mut self) -> Option<SpeechSegment> {
        if let Some(mut segment) = self.current_segment.take() {
            segment.complete();
            Some(segment)
        } else {
            None
        }
    }

    pub fn get_speech_probability(&self) -> f32 {
        self.vad.get_speech_probability()
    }
}

/// 音频预处理器
pub struct AudioPreprocessor {
    preemphasis_coeff: f32,
    noise_gate_threshold: f32,
}

impl AudioPreprocessor {
    pub fn new() -> Self {
        Self {
            preemphasis_coeff: 0.97,
            noise_gate_threshold: 0.001,
        }
    }

    pub fn process(&self, audio: &mut [f32]) {
        self.apply_noise_gate(audio);
        self.apply_preemphasis(audio);
        self.normalize_audio(audio);
    }

    fn apply_noise_gate(&self, audio: &mut [f32]) {
        let energy = audio.iter().map(|&x| x * x).sum::<f32>() / audio.len() as f32;
        
        if energy < self.noise_gate_threshold {
            for sample in audio.iter_mut() {
                *sample *= 0.1; // 大幅衰减噪音
            }
        }
    }

    fn apply_preemphasis(&self, audio: &mut [f32]) {
        if audio.len() < 2 {
            return;
        }
        
        for i in (1..audio.len()).rev() {
            audio[i] -= self.preemphasis_coeff * audio[i - 1];
        }
    }

    fn normalize_audio(&self, audio: &mut [f32]) {
        if audio.is_empty() {
            return;
        }
        
        let max_abs = audio.iter()
            .map(|&x| x.abs())
            .fold(0.0f32, |a, b| a.max(b));
            
        if max_abs > 0.0 {
            let scale = 0.95 / max_abs;
            for sample in audio.iter_mut() {
                *sample *= scale;
            }
        }
    }
}

/// 完整的音频处理管道
pub struct AudioProcessingPipeline {
    buffer: SmartAudioBuffer,
    preprocessor: AudioPreprocessor,
}

impl AudioProcessingPipeline {
    pub fn new() -> Self {
        Self {
            buffer: SmartAudioBuffer::new(),
            preprocessor: AudioPreprocessor::new(),
        }
    }

    pub fn process_chunk(&mut self, chunk: &[f32]) -> Vec<SpeechSegment> {
        let mut processed_chunk = chunk.to_vec();
        self.preprocessor.process(&mut processed_chunk);
        self.buffer.add_chunk(&processed_chunk)
    }

    pub fn get_current_segment(&self) -> Option<&SpeechSegment> {
        self.buffer.get_current_segment()
    }

    pub fn force_complete_current(&mut self) -> Option<SpeechSegment> {
        self.buffer.force_complete_current()
    }

    pub fn get_speech_probability(&self) -> f32 {
        self.buffer.get_speech_probability()
    }

    pub fn is_speech(&mut self, chunk: &[f32]) -> bool {
        self.buffer.vad.is_speech(chunk)
    }
}