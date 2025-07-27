// context_processor.rs - 上下文感知处理器
use std::collections::{HashMap, VecDeque};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};

use crate::layered_processor::TranscriptResult;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConversationSegment {
    pub text: String,
    pub speaker_id: Option<String>,
    pub timestamp: u64,
    pub confidence: f32,
    pub segment_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpeakerProfile {
    pub speaker_id: String,
    pub voice_characteristics: VoiceCharacteristics,
    pub speaking_patterns: SpeakingPatterns,
    pub vocabulary_patterns: Vec<String>,
    pub last_active: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceCharacteristics {
    pub pitch_mean: f32,
    pub pitch_variance: f32,
    pub energy_mean: f32,
    pub speaking_rate: f32, // 词/分钟
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpeakingPatterns {
    pub common_phrases: HashMap<String, u32>,
    pub pause_patterns: Vec<f32>,
    pub sentence_length_avg: f32,
}

impl Default for VoiceCharacteristics {
    fn default() -> Self {
        Self {
            pitch_mean: 0.0,
            pitch_variance: 0.0,
            energy_mean: 0.0,
            speaking_rate: 150.0, // 平均说话速度
        }
    }
}

impl Default for SpeakingPatterns {
    fn default() -> Self {
        Self {
            common_phrases: HashMap::new(),
            pause_patterns: Vec::new(),
            sentence_length_avg: 10.0,
        }
    }
}

/// 对话历史缓冲区
pub struct ConversationBuffer {
    segments: VecDeque<ConversationSegment>,
    max_segments: usize,
    max_age: Duration,
}

impl ConversationBuffer {
    pub fn new(max_segments: usize, max_age: Duration) -> Self {
        Self {
            segments: VecDeque::with_capacity(max_segments),
            max_segments,
            max_age,
        }
    }

    pub fn add_segment(&mut self, segment: ConversationSegment) {
        // 清理过期段
        self.cleanup_old_segments();
        
        // 添加新段
        if self.segments.len() >= self.max_segments {
            self.segments.pop_front();
        }
        self.segments.push_back(segment);
    }

    pub fn get_recent_context(&self, max_words: usize) -> String {
        let mut context = String::new();
        let mut word_count = 0;
        
        for segment in self.segments.iter().rev() {
            let words: Vec<&str> = segment.text.split_whitespace().collect();
            
            if word_count + words.len() > max_words {
                let remaining = max_words - word_count;
                let partial_text = words[words.len() - remaining..].join(" ");
                context = format!("{} {}", partial_text, context);
                break;
            }
            
            context = format!("{} {}", segment.text, context);
            word_count += words.len();
        }
        
        context.trim().to_string()
    }

    pub fn get_speaker_context(&self, speaker_id: &str, max_segments: usize) -> Vec<&ConversationSegment> {
        self.segments
            .iter()
            .rev()
            .filter(|seg| seg.speaker_id.as_deref() == Some(speaker_id))
            .take(max_segments)
            .collect()
    }

    pub fn generate_whisper_prompt(&self) -> String {
        let context = self.get_recent_context(50); // 最近50个词
        
        if context.is_empty() {
            String::new()
        } else {
            // 为Whisper生成上下文提示
            format!("Previous context: {}", context)
        }
    }

    fn cleanup_old_segments(&mut self) {
        let cutoff_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64
            - self.max_age.as_millis() as u64;

        while let Some(segment) = self.segments.front() {
            if segment.timestamp < cutoff_time {
                self.segments.pop_front();
            } else {
                break;
            }
        }
    }
}

/// 说话人识别和建模
pub struct SpeakerModel {
    speakers: HashMap<String, SpeakerProfile>,
    current_speaker: Option<String>,
    speaker_counter: u32,
}

impl SpeakerModel {
    pub fn new() -> Self {
        Self {
            speakers: HashMap::new(),
            current_speaker: None,
            speaker_counter: 0,
        }
    }

    pub fn identify_speaker(&mut self, audio: &[f32], text: &str) -> Option<String> {
        let characteristics = self.extract_voice_characteristics(audio);
        let speaking_patterns = self.extract_speaking_patterns(text);

        // 简单的说话人识别逻辑
        let best_match = self.find_best_speaker_match(&characteristics, &speaking_patterns);
        
        match best_match {
            Some((speaker_id, confidence)) if confidence > 0.7 => {
                self.current_speaker = Some(speaker_id.clone());
                self.update_speaker_profile(&speaker_id, characteristics, speaking_patterns);
                Some(speaker_id)
            }
            _ => {
                // 创建新说话人
                let new_speaker_id = format!("Speaker_{}", self.speaker_counter);
                self.speaker_counter += 1;
                
                let profile = SpeakerProfile {
                    speaker_id: new_speaker_id.clone(),
                    voice_characteristics: characteristics,
                    speaking_patterns,
                    vocabulary_patterns: self.extract_vocabulary_patterns(text),
                    last_active: SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_millis() as u64,
                };
                
                self.speakers.insert(new_speaker_id.clone(), profile);
                self.current_speaker = Some(new_speaker_id.clone());
                Some(new_speaker_id)
            }
        }
    }

    pub fn get_current_speaker(&self) -> Option<&String> {
        self.current_speaker.as_ref()
    }

    pub fn get_speaker_profile(&self, speaker_id: &str) -> Option<&SpeakerProfile> {
        self.speakers.get(speaker_id)
    }

    fn extract_voice_characteristics(&self, audio: &[f32]) -> VoiceCharacteristics {
        // 简化的音频特征提取
        let energy_mean = audio.iter().map(|&x| x * x).sum::<f32>() / audio.len() as f32;
        
        // TODO: 实现更复杂的特征提取（基频、共振峰等）
        VoiceCharacteristics {
            pitch_mean: 0.0, // 需要实际的基频提取
            pitch_variance: 0.0,
            energy_mean,
            speaking_rate: self.estimate_speaking_rate(audio),
        }
    }

    fn extract_speaking_patterns(&self, text: &str) -> SpeakingPatterns {
        let words: Vec<&str> = text.split_whitespace().collect();
        let sentence_count = text.matches(|c| c == '.' || c == '!' || c == '?').count().max(1);
        
        SpeakingPatterns {
            common_phrases: HashMap::new(), // TODO: 提取常用短语
            pause_patterns: Vec::new(), // TODO: 分析停顿模式
            sentence_length_avg: words.len() as f32 / sentence_count as f32,
        }
    }

    fn extract_vocabulary_patterns(&self, text: &str) -> Vec<String> {
        // 提取关键词和常用表达
        text.split_whitespace()
            .filter(|word| word.len() > 3) // 过滤短词
            .map(|word| word.to_lowercase())
            .collect()
    }

    fn estimate_speaking_rate(&self, audio: &[f32]) -> f32 {
        // 简化的说话速度估算
        let duration_seconds = audio.len() as f32 / 16000.0;
        let estimated_words = (duration_seconds * 2.5) as u32; // 大致估算
        (estimated_words as f32 / duration_seconds) * 60.0 // 词/分钟
    }

    fn find_best_speaker_match(
        &self,
        characteristics: &VoiceCharacteristics,
        _patterns: &SpeakingPatterns,
    ) -> Option<(String, f32)> {
        let mut best_match = None;
        let mut best_score = 0.0;

        for (speaker_id, profile) in &self.speakers {
            let score = self.calculate_similarity_score(&profile.voice_characteristics, characteristics);
            
            if score > best_score {
                best_score = score;
                best_match = Some((speaker_id.clone(), score));
            }
        }

        best_match
    }

    fn calculate_similarity_score(
        &self,
        profile_chars: &VoiceCharacteristics,
        current_chars: &VoiceCharacteristics,
    ) -> f32 {
        // 简化的相似度计算
        let energy_diff = (profile_chars.energy_mean - current_chars.energy_mean).abs();
        let rate_diff = (profile_chars.speaking_rate - current_chars.speaking_rate).abs();
        
        // 归一化并计算相似度
        let energy_similarity = 1.0 - (energy_diff / (profile_chars.energy_mean + 1e-6)).min(1.0);
        let rate_similarity = 1.0 - (rate_diff / 100.0).min(1.0); // 假设100词/分钟为参考
        
        (energy_similarity + rate_similarity) / 2.0
    }

    fn update_speaker_profile(
        &mut self,
        speaker_id: &str,
        characteristics: VoiceCharacteristics,
        patterns: SpeakingPatterns,
    ) {
        if let Some(profile) = self.speakers.get_mut(speaker_id) {
            // 使用指数移动平均更新特征
            let alpha = 0.1; // 学习率
            
            profile.voice_characteristics.energy_mean = 
                profile.voice_characteristics.energy_mean * (1.0 - alpha) + 
                characteristics.energy_mean * alpha;
            
            profile.voice_characteristics.speaking_rate = 
                profile.voice_characteristics.speaking_rate * (1.0 - alpha) + 
                characteristics.speaking_rate * alpha;
            
            profile.speaking_patterns.sentence_length_avg = 
                profile.speaking_patterns.sentence_length_avg * (1.0 - alpha) + 
                patterns.sentence_length_avg * alpha;
            
            profile.last_active = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64;
        }
    }
}

/// 语言模型辅助纠错
pub struct LanguageContextModel {
    common_corrections: HashMap<String, String>,
    context_rules: Vec<ContextRule>,
}

#[derive(Debug, Clone)]
pub struct ContextRule {
    pub pattern: String,
    pub replacement: String,
    pub context_required: Vec<String>,
}

impl LanguageContextModel {
    pub fn new() -> Self {
        let mut common_corrections = HashMap::new();
        
        // 常见识别错误修正
        common_corrections.insert("那个那个".to_string(), "那个".to_string());
        common_corrections.insert("就是就是".to_string(), "就是".to_string());
        common_corrections.insert("然后然后".to_string(), "然后".to_string());
        common_corrections.insert("这个这个".to_string(), "这个".to_string());
        
        Self {
            common_corrections,
            context_rules: Vec::new(),
        }
    }

    pub fn correct_text(&self, text: &str, context: &str, speaker_info: &Option<String>) -> String {
        let mut corrected = text.to_string();
        
        // 应用通用修正
        for (wrong, correct) in &self.common_corrections {
            corrected = corrected.replace(wrong, correct);
        }
        
        // 应用上下文规则
        corrected = self.apply_context_rules(&corrected, context);
        
        // 说话人特定修正
        if let Some(speaker_id) = speaker_info {
            corrected = self.apply_speaker_specific_corrections(&corrected, speaker_id);
        }
        
        // 基本的语法修正
        corrected = self.apply_basic_grammar_fixes(&corrected);
        
        corrected
    }

    fn apply_context_rules(&self, text: &str, _context: &str) -> String {
        // TODO: 实现基于上下文的智能修正
        text.to_string()
    }

    fn apply_speaker_specific_corrections(&self, text: &str, _speaker_id: &str) -> String {
        // TODO: 实现说话人特定的修正规则
        text.to_string()
    }

    fn apply_basic_grammar_fixes(&self, text: &str) -> String {
        let mut result = text.to_string();
        
        // 修正重复词汇
        let words: Vec<&str> = text.split_whitespace().collect();
        let mut fixed_words = Vec::new();
        let mut last_word = "";
        
        for word in words {
            if word != last_word || word.len() <= 2 {
                fixed_words.push(word);
                last_word = word;
            }
        }
        
        result = fixed_words.join(" ");
        
        // 修正标点符号
        result = result.replace(" ,", ",");
        result = result.replace(" .", ".");
        result = result.replace(" !", "!");
        result = result.replace(" ?", "?");
        
        result
    }
}

/// 完整的上下文感知处理器
pub struct ContextAwareProcessor {
    conversation_buffer: ConversationBuffer,
    speaker_model: SpeakerModel,
    language_model: LanguageContextModel,
}

impl ContextAwareProcessor {
    pub fn new() -> Self {
        Self {
            conversation_buffer: ConversationBuffer::new(100, Duration::from_secs(300)), // 5分钟历史
            speaker_model: SpeakerModel::new(),
            language_model: LanguageContextModel::new(),
        }
    }

    pub fn process_with_context(
        &mut self,
        result: TranscriptResult,
        audio: &[f32],
    ) -> TranscriptResult {
        // 1. 说话人识别
        let speaker_id = self.speaker_model.identify_speaker(audio, &result.text);
        
        // 2. 获取上下文
        let context = self.conversation_buffer.get_recent_context(100);
        
        // 3. 语言模型纠错
        let corrected_text = self.language_model.correct_text(
            &result.text,
            &context,
            &speaker_id,
        );
        
        // 4. 更新对话历史
        let segment = ConversationSegment {
            text: corrected_text.clone(),
            speaker_id: speaker_id.clone(),
            timestamp: result.timestamp,
            confidence: result.confidence,
            segment_id: result.segment_id.clone(),
        };
        self.conversation_buffer.add_segment(segment);
        
        // 5. 返回增强结果
        TranscriptResult {
            text: corrected_text,
            speaker: speaker_id,
            confidence: if result.confidence < 0.5 { 
                result.confidence * 1.1 // 上下文增强置信度
            } else { 
                result.confidence 
            },
            ..result
        }
    }

    pub fn get_conversation_context(&self, max_words: usize) -> String {
        self.conversation_buffer.get_recent_context(max_words)
    }

    pub fn get_whisper_prompt(&self) -> String {
        self.conversation_buffer.generate_whisper_prompt()
    }

    pub fn get_current_speaker(&self) -> Option<&String> {
        self.speaker_model.get_current_speaker()
    }

    pub fn get_speaker_count(&self) -> usize {
        self.speaker_model.speakers.len()
    }
}