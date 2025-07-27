// result_manager.rs - 结果管理系统
use std::collections::{HashMap, VecDeque};
use std::time::Duration;
use serde::{Deserialize, Serialize};

use crate::layered_processor::TranscriptResult;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManagedTranscriptSegment {
    pub id: String,
    pub text: String,
    pub confidence: f32,
    pub speaker: Option<String>,
    pub timestamp: u64,
    pub start_time: u64,
    pub end_time: u64,
    pub is_final: bool,
    pub source: SegmentSource,
    pub corrections: Vec<TextCorrection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SegmentSource {
    FastProcessing,
    AccurateProcessing,
    Merged,
    UserCorrected,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextCorrection {
    pub original: String,
    pub corrected: String,
    pub reason: CorrectionReason,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CorrectionReason {
    DeduplicationMerge,
    ContextualCorrection,
    GrammarFix,
    SpeakerConsistency,
    UserEdit,
}

/// 去重和合并逻辑
pub struct DeduplicationEngine {
    similarity_threshold: f32,
    time_window: Duration,
}

impl DeduplicationEngine {
    pub fn new() -> Self {
        Self {
            similarity_threshold: 0.8,
            time_window: Duration::from_millis(2000),
        }
    }

    pub fn find_duplicates(&self, results: &[TranscriptResult]) -> Vec<(usize, usize)> {
        let mut duplicates = Vec::new();
        
        for i in 0..results.len() {
            for j in (i + 1)..results.len() {
                if self.is_duplicate(&results[i], &results[j]) {
                    duplicates.push((i, j));
                }
            }
        }
        
        duplicates
    }

    pub fn merge_similar_results(&self, results: Vec<TranscriptResult>) -> Vec<TranscriptResult> {
        if results.len() <= 1 {
            return results;
        }

        let mut merged = Vec::new();
        let mut used = vec![false; results.len()];

        for i in 0..results.len() {
            if used[i] {
                continue;
            }

            let mut group = vec![&results[i]];
            used[i] = true;

            // 查找相似的结果
            for j in (i + 1)..results.len() {
                if !used[j] && self.is_duplicate(&results[i], &results[j]) {
                    group.push(&results[j]);
                    used[j] = true;
                }
            }

            // 合并组内结果
            if group.len() == 1 {
                merged.push(results[i].clone());
            } else {
                merged.push(self.merge_group(group));
            }
        }

        merged
    }

    fn is_duplicate(&self, a: &TranscriptResult, b: &TranscriptResult) -> bool {
        // 时间窗口检查
        let time_diff = if a.timestamp > b.timestamp {
            a.timestamp - b.timestamp
        } else {
            b.timestamp - a.timestamp
        };

        if time_diff > self.time_window.as_millis() as u64 {
            return false;
        }

        // 文本相似度检查
        let similarity = self.calculate_text_similarity(&a.text, &b.text);
        similarity >= self.similarity_threshold
    }

    fn calculate_text_similarity(&self, text1: &str, text2: &str) -> f32 {
        if text1 == text2 {
            return 1.0;
        }

        let words1: Vec<&str> = text1.split_whitespace().collect();
        let words2: Vec<&str> = text2.split_whitespace().collect();

        if words1.is_empty() && words2.is_empty() {
            return 1.0;
        }

        if words1.is_empty() || words2.is_empty() {
            return 0.0;
        }

        // 计算词级别的Jaccard相似度
        let set1: std::collections::HashSet<&str> = words1.iter().cloned().collect();
        let set2: std::collections::HashSet<&str> = words2.iter().cloned().collect();

        let intersection = set1.intersection(&set2).count();
        let union = set1.union(&set2).count();

        if union == 0 {
            0.0
        } else {
            intersection as f32 / union as f32
        }
    }

    fn merge_group(&self, group: Vec<&TranscriptResult>) -> TranscriptResult {
        // 选择置信度最高的作为基础
        let best = group.iter()
            .max_by(|a, b| a.confidence.partial_cmp(&b.confidence).unwrap())
            .unwrap();

        // 合并文本（选择最长的）
        let longest_text = group.iter()
            .max_by_key(|r| r.text.len())
            .unwrap()
            .text
            .clone();

        // 平均置信度
        let avg_confidence = group.iter()
            .map(|r| r.confidence)
            .sum::<f32>() / group.len() as f32;

        TranscriptResult {
            text: longest_text,
            confidence: avg_confidence,
            is_temporary: false, // 合并后的结果是最终的
            speaker: best.speaker.clone(),
            timestamp: best.timestamp,
            processing_time_ms: group.iter().map(|r| r.processing_time_ms).min().unwrap_or(0),
            segment_id: format!("merged_{}", best.segment_id),
        }
    }
}

/// 段落组织器
pub struct SegmentOrganizer {
    segments: VecDeque<ManagedTranscriptSegment>,
    max_segments: usize,
    auto_paragraph_threshold: Duration,
}

impl SegmentOrganizer {
    pub fn new(max_segments: usize) -> Self {
        Self {
            segments: VecDeque::with_capacity(max_segments),
            max_segments,
            auto_paragraph_threshold: Duration::from_secs(3),
        }
    }

    pub fn add_segment(&mut self, result: TranscriptResult, source: SegmentSource) -> String {
        let segment_id = format!("seg_{}_{}", result.timestamp, result.segment_id);
        
        let segment = ManagedTranscriptSegment {
            id: segment_id.clone(),
            text: result.text,
            confidence: result.confidence,
            speaker: result.speaker,
            timestamp: result.timestamp,
            start_time: result.timestamp,
            end_time: result.timestamp + result.processing_time_ms,
            is_final: !result.is_temporary,
            source,
            corrections: Vec::new(),
        };

        // 检查是否需要合并到前一个段落
        let should_merge = if let Some(last_segment) = self.segments.back() {
            self.should_merge_with_previous(&segment, last_segment)
        } else {
            false
        };

        if should_merge {
            let last_id = self.segments.back().unwrap().id.clone();
            // 直接在这里合并，避免借用检查问题
            if let Some(last_segment) = self.segments.back_mut() {
                // 计算原始文本长度用于加权
                let target_len = last_segment.text.len() as f32;
                let source_len = segment.text.len() as f32;
                
                // 合并文本
                if !last_segment.text.is_empty() && !segment.text.is_empty() {
                    last_segment.text = format!("{} {}", last_segment.text, segment.text);
                } else if last_segment.text.is_empty() {
                    last_segment.text = segment.text;
                }

                // 更新时间范围
                last_segment.end_time = segment.end_time;

                // 更新置信度（加权平均）
                let total_len = target_len + source_len;
                
                if total_len > 0.0 {
                    last_segment.confidence = (last_segment.confidence * target_len + segment.confidence * source_len) / total_len;
                }

                // 合并修正记录
                last_segment.corrections.extend(segment.corrections);

                // 更新来源
                last_segment.source = SegmentSource::Merged;
                
                return last_id;
            }
        }

        // 添加新段落
        if self.segments.len() >= self.max_segments {
            self.segments.pop_front();
        }
        
        self.segments.push_back(segment);
        segment_id
    }

    pub fn update_segment(&mut self, segment_id: &str, new_text: String, source: SegmentSource) -> bool {
        for segment in &mut self.segments {
            if segment.id == segment_id {
                let correction = TextCorrection {
                    original: segment.text.clone(),
                    corrected: new_text.clone(),
                    reason: match source {
                        SegmentSource::UserCorrected => CorrectionReason::UserEdit,
                        _ => CorrectionReason::ContextualCorrection,
                    },
                    confidence: 0.9,
                };
                
                segment.corrections.push(correction);
                segment.text = new_text;
                segment.source = source;
                segment.is_final = true;
                
                return true;
            }
        }
        false
    }

    pub fn get_segments(&self) -> &VecDeque<ManagedTranscriptSegment> {
        &self.segments
    }

    pub fn get_segment(&self, segment_id: &str) -> Option<&ManagedTranscriptSegment> {
        self.segments.iter().find(|s| s.id == segment_id)
    }

    pub fn get_continuous_text(&self, max_segments: Option<usize>) -> String {
        let limit = max_segments.unwrap_or(self.segments.len());
        
        self.segments
            .iter()
            .rev()
            .take(limit)
            .rev()
            .map(|s| &s.text)
            .map(|s| s.as_str())
            .collect::<Vec<_>>()
            .join(" ")
    }

    fn should_merge_with_previous(&self, new_segment: &ManagedTranscriptSegment, last_segment: &ManagedTranscriptSegment) -> bool {
        // 检查时间间隔
        let time_gap = if new_segment.start_time > last_segment.end_time {
            new_segment.start_time - last_segment.end_time
        } else {
            0
        };

        // 检查说话人一致性
        let same_speaker = match (&new_segment.speaker, &last_segment.speaker) {
            (Some(a), Some(b)) => a == b,
            (None, None) => true,
            _ => false,
        };

        // 合并条件
        time_gap < self.auto_paragraph_threshold.as_millis() as u64 && 
        same_speaker &&
        !last_segment.is_final
    }

    fn merge_segments(&mut self, target: &mut ManagedTranscriptSegment, source: ManagedTranscriptSegment) {
        // 计算原始文本长度用于加权
        let target_len = target.text.len() as f32;
        let source_len = source.text.len() as f32;
        
        // 合并文本
        if !target.text.is_empty() && !source.text.is_empty() {
            target.text = format!("{} {}", target.text, source.text);
        } else if target.text.is_empty() {
            target.text = source.text;
        }

        // 更新时间范围
        target.end_time = source.end_time;

        // 更新置信度（加权平均）
        let total_len = target_len + source_len;
        
        if total_len > 0.0 {
            target.confidence = (target.confidence * target_len + source.confidence * source_len) / total_len;
        }

        // 合并修正记录
        target.corrections.extend(source.corrections);

        // 更新来源
        target.source = SegmentSource::Merged;
    }
}

/// 质量评估器
pub struct QualityAssessor {
    confidence_threshold: f32,
    length_threshold: usize,
}

impl QualityAssessor {
    pub fn new() -> Self {
        Self {
            confidence_threshold: 0.6,
            length_threshold: 3, // 最少3个字符
        }
    }

    pub fn assess_quality(&self, segment: &ManagedTranscriptSegment) -> QualityScore {
        let mut score = QualityScore::default();

        // 置信度评分
        score.confidence_score = segment.confidence;
        
        // 长度评分
        score.length_score = if segment.text.len() >= self.length_threshold {
            1.0
        } else {
            segment.text.len() as f32 / self.length_threshold as f32
        };

        // 一致性评分（基于修正次数）
        score.consistency_score = if segment.corrections.is_empty() {
            1.0
        } else {
            (1.0 / (1.0 + segment.corrections.len() as f32)).max(0.1)
        };

        // 综合评分
        score.overall_score = score.confidence_score * 0.5 + 
                              score.length_score * 0.3 + 
                              score.consistency_score * 0.2;

        score
    }

    pub fn is_high_quality(&self, segment: &ManagedTranscriptSegment) -> bool {
        let quality = self.assess_quality(segment);
        quality.overall_score > 0.7
    }
}

#[derive(Debug, Clone, Default)]
pub struct QualityScore {
    pub confidence_score: f32,
    pub length_score: f32,
    pub consistency_score: f32,
    pub overall_score: f32,
}

/// 完整的结果管理器
pub struct ResultManager {
    deduplication_engine: DeduplicationEngine,
    segment_organizer: SegmentOrganizer,
    quality_assessor: QualityAssessor,
    pending_results: HashMap<String, TranscriptResult>,
}

impl ResultManager {
    pub fn new(max_segments: usize) -> Self {
        Self {
            deduplication_engine: DeduplicationEngine::new(),
            segment_organizer: SegmentOrganizer::new(max_segments),
            quality_assessor: QualityAssessor::new(),
            pending_results: HashMap::new(),
        }
    }

    pub fn process_result(&mut self, result: TranscriptResult) -> Vec<String> {
        let mut updated_segments = Vec::new();

        if result.is_temporary {
            // 临时结果，暂存
            self.pending_results.insert(result.segment_id.clone(), result);
        } else {
            // 最终结果，进行处理
            let mut results_to_process = vec![result];
            
            // 收集相关的临时结果
            let related_keys: Vec<String> = self.pending_results
                .keys()
                .filter(|k| self.is_related_segment(k, &results_to_process[0]))
                .cloned()
                .collect();

            for key in &related_keys {
                if let Some(pending) = self.pending_results.remove(key) {
                    results_to_process.push(pending);
                }
            }

            // 去重和合并
            let merged_results = self.deduplication_engine.merge_similar_results(results_to_process);

            // 添加到段落组织器
            for merged_result in merged_results {
                let source = if merged_result.segment_id.starts_with("merged_") {
                    SegmentSource::Merged
                } else if merged_result.is_temporary {
                    SegmentSource::FastProcessing
                } else {
                    SegmentSource::AccurateProcessing
                };

                let segment_id = self.segment_organizer.add_segment(merged_result, source);
                updated_segments.push(segment_id);
            }
        }

        updated_segments
    }

    pub fn update_segment_text(&mut self, segment_id: &str, new_text: String) -> bool {
        self.segment_organizer.update_segment(segment_id, new_text, SegmentSource::UserCorrected)
    }

    pub fn get_segment(&self, segment_id: &str) -> Option<&ManagedTranscriptSegment> {
        self.segment_organizer.get_segment(segment_id)
    }

    pub fn get_all_segments(&self) -> &VecDeque<ManagedTranscriptSegment> {
        self.segment_organizer.get_segments()
    }

    pub fn get_continuous_text(&self, max_segments: Option<usize>) -> String {
        self.segment_organizer.get_continuous_text(max_segments)
    }

    pub fn get_quality_report(&self) -> QualityReport {
        let segments = self.segment_organizer.get_segments();
        let mut report = QualityReport::default();

        for segment in segments {
            let quality = self.quality_assessor.assess_quality(segment);
            
            report.total_segments += 1;
            report.total_confidence += quality.confidence_score;
            
            if quality.overall_score > 0.8 {
                report.high_quality_segments += 1;
            } else if quality.overall_score < 0.5 {
                report.low_quality_segments += 1;
            }

            if segment.corrections.len() > 0 {
                report.corrected_segments += 1;
            }
        }

        if report.total_segments > 0 {
            report.average_confidence = report.total_confidence / report.total_segments as f32;
            report.quality_percentage = (report.high_quality_segments as f32 / report.total_segments as f32) * 100.0;
        }

        report
    }

    pub fn cleanup_old_pending(&mut self, max_age: Duration) {
        let cutoff_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64
            - max_age.as_millis() as u64;

        self.pending_results.retain(|_, result| result.timestamp >= cutoff_time);
    }

    fn is_related_segment(&self, pending_key: &str, final_result: &TranscriptResult) -> bool {
        if let Some(pending) = self.pending_results.get(pending_key) {
            let time_diff = if final_result.timestamp > pending.timestamp {
                final_result.timestamp - pending.timestamp
            } else {
                pending.timestamp - final_result.timestamp
            };

            // 时间窗口内且文本相似
            time_diff < 3000 && // 3秒窗口
            self.deduplication_engine.calculate_text_similarity(&pending.text, &final_result.text) > 0.6
        } else {
            false
        }
    }
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct QualityReport {
    pub total_segments: usize,
    pub high_quality_segments: usize,
    pub low_quality_segments: usize,
    pub corrected_segments: usize,
    pub average_confidence: f32,
    pub quality_percentage: f32,
    pub total_confidence: f32,
}