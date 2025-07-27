import { invoke } from '@tauri-apps/api/core';
import { TranscriptionRecord } from '../types/transcription';

export interface StorageTranscriptionRecord {
  id: string;
  name: string;
  original_file_name: string;
  file_path: string;
  file_size: number;
  duration?: number;
  status: 'waiting' | 'processing' | 'completed' | 'failed';
  progress: number;
  error_message?: string;
  created_at: string; // ISO string
  updated_at: string; // ISO string
  tags: string[];
  category?: string;
  is_starred: boolean;
  config: {
    language: string;
    mode: string;
    audio_enhancement: boolean;
  };
  result?: {
    text: string;
    processing_time: number;
    accuracy?: number;
    segments?: Array<{
      id: string;
      start_time: number;
      end_time: number;
      text: string;
      speaker?: string;
      confidence?: number;
    }>;
  };
}

class StorageService {
  private initialized = false;

  async init(): Promise<void> {
    if (!this.initialized) {
      await invoke('init_storage');
      this.initialized = true;
    }
  }

  async saveRecord(record: TranscriptionRecord): Promise<void> {
    await this.init();
    
    const storageRecord: StorageTranscriptionRecord = {
      id: record.id,
      name: record.name,
      original_file_name: record.originalFileName,
      file_path: record.filePath,
      file_size: record.fileSize,
      duration: record.duration,
      status: record.status,
      progress: record.progress,
      error_message: record.error,
      created_at: record.createdAt.toISOString(),
      updated_at: record.updatedAt.toISOString(),
      tags: record.tags,
      category: record.category,
      is_starred: record.isStarred,
      config: {
        language: record.config.language,
        mode: record.config.mode,
        audio_enhancement: record.config.audioEnhancement,
      },
      result: record.result ? {
        text: record.result.text,
        processing_time: record.result.processingTime,
        accuracy: record.result.accuracy,
        segments: record.result.segments?.map(seg => ({
          id: seg.id,
          start_time: seg.startTime,
          end_time: seg.endTime,
          text: seg.text,
          speaker: seg.speaker,
          confidence: seg.confidence,
        })),
      } : undefined,
    };

    await invoke('save_transcription_record', { record: storageRecord });
  }

  async getRecord(id: string): Promise<TranscriptionRecord | null> {
    await this.init();
    
    const storageRecord: StorageTranscriptionRecord | null = await invoke('get_transcription_record', { id });
    if (!storageRecord) return null;

    return this.convertFromStorage(storageRecord);
  }

  async getAllRecords(): Promise<TranscriptionRecord[]> {
    await this.init();
    
    const storageRecords: StorageTranscriptionRecord[] = await invoke('get_all_transcription_records');
    return storageRecords.map(record => this.convertFromStorage(record));
  }

  async updateStatus(id: string, status: string, progress: number, error?: string): Promise<void> {
    await this.init();
    await invoke('update_transcription_status', { id, status, progress, error });
  }

  async updateResult(id: string, result: {
    text: string;
    processing_time: number;
    accuracy?: number;
    segments?: Array<{
      id: string;
      start_time: number;
      end_time: number;
      text: string;
      speaker?: string;
      confidence?: number;
    }>;
  }): Promise<void> {
    await this.init();
    await invoke('update_transcription_result', { id, result });
  }

  async deleteRecord(id: string): Promise<void> {
    await this.init();
    await invoke('delete_transcription_record', { id });
  }

  async toggleStar(id: string): Promise<boolean> {
    await this.init();
    return await invoke('toggle_transcription_star', { id });
  }

  async updateRecordName(id: string, name: string): Promise<void> {
    await this.init();
    await invoke('update_transcription_name', { id, name });
  }

  async searchRecords(query: string, category?: string): Promise<TranscriptionRecord[]> {
    await this.init();
    
    const storageRecords: StorageTranscriptionRecord[] = await invoke('search_transcription_records', { 
      query,
      category 
    });
    return storageRecords.map(record => this.convertFromStorage(record));
  }

  private convertFromStorage(storageRecord: StorageTranscriptionRecord): TranscriptionRecord {
    return {
      id: storageRecord.id,
      name: storageRecord.name,
      originalFileName: storageRecord.original_file_name,
      filePath: storageRecord.file_path,
      fileSize: storageRecord.file_size,
      duration: storageRecord.duration,
      status: storageRecord.status,
      progress: storageRecord.progress,
      error: storageRecord.error_message,
      createdAt: new Date(storageRecord.created_at),
      updatedAt: new Date(storageRecord.updated_at),
      tags: storageRecord.tags,
      category: storageRecord.category,
      isStarred: storageRecord.is_starred,
      config: {
        language: storageRecord.config.language,
        mode: storageRecord.config.mode,
        audioEnhancement: storageRecord.config.audio_enhancement,
      },
      result: storageRecord.result ? {
        text: storageRecord.result.text,
        processingTime: storageRecord.result.processing_time,
        accuracy: storageRecord.result.accuracy,
        segments: storageRecord.result.segments?.map(seg => ({
          id: seg.id,
          startTime: seg.start_time,
          endTime: seg.end_time,
          text: seg.text,
          speaker: seg.speaker,
          confidence: seg.confidence,
        })),
      } : undefined,
    };
  }
}

export const storageService = new StorageService();