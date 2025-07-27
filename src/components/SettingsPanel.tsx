import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  PlayIcon,
  StopIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '../utils/cn';

interface AudioDevice {
  id: string;
  name: string;
  is_default: boolean;
  device_type: string;
  supported_sample_rates: number[];
  supported_channels: number[];
}

interface AudioDeviceInfo {
  input_devices: AudioDevice[];
  output_devices: AudioDevice[];
}

interface AudioTestResult {
  success: boolean;
  message: string;
  level?: number;
}

interface MicTestState {
  phase: string; // "monitoring", "recording", "playback", "completed"
  volume_level: number;
  countdown: number;
  message: string;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
}) => {
  
  // 音频设备状态
  const [audioDevices, setAudioDevices] = useState<AudioDeviceInfo | null>(null);
  const [selectedInputDevice, setSelectedInputDevice] = useState<string>('');
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string>('');
  const [isTestingInput, setIsTestingInput] = useState(false);
  const [isTestingOutput, setIsTestingOutput] = useState(false);
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  // 新的麦克风测试状态
  const [micTestState, setMicTestState] = useState<MicTestState | null>(null);
  const [micTestInterval, setMicTestInterval] = useState<number | null>(null);

  // 获取音频设备列表
  const loadAudioDevices = async () => {
    try {
      setLoading(true);
      const devices = await invoke<AudioDeviceInfo>('get_audio_devices');
      setAudioDevices(devices);
      
      // 设置默认选中设备
      const defaultInput = devices.input_devices.find(d => d.is_default);
      const defaultOutput = devices.output_devices.find(d => d.is_default);
      
      if (defaultInput) setSelectedInputDevice(defaultInput.id);
      if (defaultOutput) setSelectedOutputDevice(defaultOutput.id);
      
    } catch (error) {
      console.error('Failed to load audio devices:', error);
      setTestResult('获取音频设备失败: ' + String(error));
    } finally {
      setLoading(false);
    }
  };
  
  // 测试音频设备
  const testAudioDevice = async (deviceId: string, deviceType: string) => {
    try {
      if (deviceType === 'input') {
        setIsTestingInput(true);
        setTestResult('正在测试输入设备，请对着麦克风说话...');
      } else {
        setIsTestingOutput(true);
        setTestResult('正在测试输出设备，请听测试音调...');
      }
      
      const result = await invoke<AudioTestResult>('test_audio_device', {
        deviceId,
        deviceType
      });
      
      setTestResult(result.message);
      
    } catch (error) {
      setTestResult('设备测试失败: ' + String(error));
    } finally {
      setIsTestingInput(false);
      setIsTestingOutput(false);
    }
  };
  
  // 停止音频测试
  const stopAudioTest = async () => {
    try {
      await invoke('stop_audio_test');
      setTestResult('测试音已停止');
      setIsTestingOutput(false);
    } catch (error) {
      console.error('Failed to stop audio test:', error);
    }
  };
  
  // 启动新的麦克风测试
  const startMicTest = async (deviceId: string) => {
    try {
      setIsTestingInput(true);
      setTestResult('');
      
      // 启动测试
      await invoke('start_mic_test', { deviceId });
      
      // 开始轮询测试状态
      const interval = setInterval(async () => {
        try {
          const state = await invoke<MicTestState | null>('get_mic_test_state');
          setMicTestState(state);
          
          if (state && (state.phase === 'completed' || state.phase === 'error')) {
            clearInterval(interval);
            setMicTestInterval(null);
            setIsTestingInput(false);
          }
        } catch (error) {
          console.error('Failed to get mic test state:', error);
          clearInterval(interval);
          setMicTestInterval(null);
          setIsTestingInput(false);
        }
      }, 100); // 100ms更新一次
      
      setMicTestInterval(interval);
      
    } catch (error) {
      setTestResult('麦克风测试启动失败: ' + String(error));
      setIsTestingInput(false);
    }
  };
  
  // 播放录制的音频
  const playRecordedAudio = async () => {
    try {
      await invoke('play_recorded_audio');
      setTestResult('正在播放录制的音频...');
    } catch (error) {
      setTestResult('播放失败: ' + String(error));
    }
  };
  
  // 停止麦克风测试
  const stopMicTest = () => {
    if (micTestInterval) {
      clearInterval(micTestInterval);
      setMicTestInterval(null);
    }
    setIsTestingInput(false);
    setMicTestState(null);
  };
  
  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (micTestInterval) {
        clearInterval(micTestInterval);
      }
    };
  }, [micTestInterval]);
  
  // 设置全局音频设备
  const setGlobalDevice = async (deviceId: string, deviceType: string) => {
    try {
      await invoke('set_global_audio_device', { deviceId, deviceType });
      console.log(`Set global ${deviceType} device to:`, deviceId);
    } catch (error) {
      console.error('Failed to set global device:', error);
    }
  };
  
  // 组件挂载时加载设备列表
  useEffect(() => {
    if (isOpen) {
      loadAudioDevices();
    }
  }, [isOpen]);
  
  // 设备选择变化时更新全局设置
  useEffect(() => {
    if (selectedInputDevice) {
      setGlobalDevice(selectedInputDevice, 'input');
    }
  }, [selectedInputDevice]);
  
  useEffect(() => {
    if (selectedOutputDevice) {
      setGlobalDevice(selectedOutputDevice, 'output');
    }
  }, [selectedOutputDevice]);

  // 保存设置
  const saveSettings = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center animate-in fade-in-0 duration-300">
      <div className="bg-surface-primary rounded-macos-xl shadow-2xl border border-border-primary/50 w-[560px] max-h-[85vh] overflow-hidden transform scale-100 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-primary/50 bg-gradient-to-r from-surface-primary to-surface-secondary/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-macos-blue/10 rounded-macos-md">
              <Cog6ToothIcon className="w-5 h-5 text-macos-blue" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">音频设备设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover/80 rounded-full transition-all duration-200 hover:scale-110"
          >
            <XMarkIcon className="w-5 h-5 text-text-secondary hover:text-text-primary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[65vh] overflow-y-auto macos-scrollbar space-y-8">
          {/* Input Devices Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-macos-md">
                  <MicrophoneIcon className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">输入设备</h3>
              </div>
              <button
                onClick={loadAudioDevices}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-macos-blue hover:text-blue-600 disabled:opacity-50 hover:bg-macos-blue/5 rounded-macos-md transition-all duration-200"
              >
                <ArrowPathIcon className={cn("w-4 h-4", loading && "animate-spin")} />
                {loading ? '刷新中...' : '刷新'}
              </button>
            </div>
            
            <div className="space-y-3">
              {audioDevices?.input_devices.map((device) => (
                <div key={device.id} className="group p-4 rounded-macos-lg border border-border-secondary/50 hover:border-border-primary/50 hover:bg-surface-hover/30 transition-all duration-200">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-4 flex-1 cursor-pointer">
                      <div className="relative">
                        <input
                          type="radio"
                          name="inputDevice"
                          checked={selectedInputDevice === device.id}
                          onChange={() => setSelectedInputDevice(device.id)}
                          className="w-4 h-4 text-macos-blue focus:ring-macos-blue/30 focus:ring-offset-0 border-2 border-border-secondary"
                        />
                        {selectedInputDevice === device.id && (
                          <div className="absolute inset-0 rounded-full bg-macos-blue/20 animate-pulse" />
                        )}
                      </div>
                      <div className="p-2 bg-green-500/10 rounded-macos-md group-hover:bg-green-500/20 transition-colors">
                        <MicrophoneIcon className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-text-primary font-medium truncate">{device.name}</span>
                          {device.is_default && (
                            <span className="px-2 py-0.5 text-xs bg-macos-blue/10 text-macos-blue rounded-full font-medium">
                              系统默认
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-text-secondary">
                          支持采样率: {device.supported_sample_rates.join(', ')} Hz
                        </div>
                      </div>
                    </label>
                    <button
                      onClick={() => isTestingInput ? stopMicTest() : startMicTest(device.id)}
                      disabled={isTestingOutput}
                      className="px-4 py-2 text-sm bg-macos-blue text-white rounded-macos-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-200 hover:shadow-md"
                    >
                      {isTestingInput ? (
                        <>
                          <StopIcon className="w-4 h-4" />
                          停止测试
                        </>
                      ) : (
                        <>
                          <PlayIcon className="w-4 h-4" />
                          测试麦克风
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
              
              {audioDevices?.input_devices.length === 0 && (
                <div className="text-center py-8 text-text-secondary">
                  <MicrophoneIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">未检测到输入设备</p>
                </div>
              )}
            </div>
          </div>

          {/* Output Devices Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-macos-md">
                <SpeakerWaveIcon className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">输出设备</h3>
            </div>
            
            <div className="space-y-3">
              {audioDevices?.output_devices.map((device) => (
                <div key={device.id} className="group p-4 rounded-macos-lg border border-border-secondary/50 hover:border-border-primary/50 hover:bg-surface-hover/30 transition-all duration-200">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-4 flex-1 cursor-pointer">
                      <div className="relative">
                        <input
                          type="radio"
                          name="outputDevice"
                          checked={selectedOutputDevice === device.id}
                          onChange={() => setSelectedOutputDevice(device.id)}
                          className="w-4 h-4 text-macos-blue focus:ring-macos-blue/30 focus:ring-offset-0 border-2 border-border-secondary"
                        />
                        {selectedOutputDevice === device.id && (
                          <div className="absolute inset-0 rounded-full bg-macos-blue/20 animate-pulse" />
                        )}
                      </div>
                      <div className="p-2 bg-blue-500/10 rounded-macos-md group-hover:bg-blue-500/20 transition-colors">
                        <SpeakerWaveIcon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-text-primary font-medium truncate">{device.name}</span>
                          {device.is_default && (
                            <span className="px-2 py-0.5 text-xs bg-macos-blue/10 text-macos-blue rounded-full font-medium">
                              系统默认
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-text-secondary">
                          支持采样率: {device.supported_sample_rates.join(', ')} Hz
                        </div>
                      </div>
                    </label>
                    <button
                      onClick={() => isTestingOutput ? stopAudioTest() : testAudioDevice(device.id, 'output')}
                      disabled={isTestingInput}
                      className="px-4 py-2 text-sm bg-macos-blue text-white rounded-macos-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-200 hover:shadow-md"
                    >
                      {isTestingOutput ? (
                        <>
                          <StopIcon className="w-4 h-4" />
                          停止测试
                        </>
                      ) : (
                        <>
                          <PlayIcon className="w-4 h-4" />
                          测试音响
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
              
              {audioDevices?.output_devices.length === 0 && (
                <div className="text-center py-8 text-text-secondary">
                  <SpeakerWaveIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">未检测到输出设备</p>
                </div>
              )}
            </div>
          </div>

          {/* Microphone Test Status */}
          {micTestState && (
            <div className="p-6 bg-gradient-to-br from-surface-secondary to-surface-secondary/50 rounded-macos-xl border border-border-primary/30 shadow-inner">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  {micTestState.phase === 'monitoring' && (
                    <>
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                      音量监测中
                    </>
                  )}
                  {micTestState.phase === 'recording' && (
                    <>
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                      录音测试中
                    </>
                  )}
                  {micTestState.phase === 'playback' && (
                    <>
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                      准备回放
                    </>
                  )}
                  {micTestState.phase === 'completed' && (
                    <>
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                      测试完成
                    </>
                  )}
                  {micTestState.phase === 'error' && (
                    <>
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      测试错误
                    </>
                  )}
                </h4>
                {micTestState.countdown > 0 && (
                  <div className="px-3 py-1 bg-macos-blue/10 text-macos-blue rounded-macos-md font-mono text-lg font-bold">
                    {micTestState.countdown}s
                  </div>
                )}
              </div>
              
              {/* Volume Indicator */}
              {(micTestState.phase === 'monitoring' || micTestState.phase === 'recording') && (
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary font-medium">音量水平</span>
                    <span className="text-text-primary font-mono font-bold">
                      {(micTestState.volume_level * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="relative w-full bg-surface-primary rounded-full h-3 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-75 relative overflow-hidden",
                        micTestState.volume_level > 0.7 ? "bg-gradient-to-r from-red-400 to-red-600" :
                        micTestState.volume_level > 0.4 ? "bg-gradient-to-r from-yellow-400 to-yellow-600" :
                        micTestState.volume_level > 0.1 ? "bg-gradient-to-r from-green-400 to-green-600" :
                        "bg-gradient-to-r from-gray-400 to-gray-600"
                      )}
                      style={{ width: `${Math.min(micTestState.volume_level * 100, 100)}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>
                </div>
              )}
              
              <p className="text-sm text-text-secondary mb-4 bg-surface-primary/50 p-3 rounded-macos-md">
                {micTestState.message}
              </p>
              
              {/* Play Recording Button */}
              {micTestState.phase === 'playback' && (
                <button
                  onClick={playRecordedAudio}
                  className="w-full px-6 py-3 bg-gradient-to-r from-macos-blue to-blue-600 text-white rounded-macos-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-3 font-medium shadow-lg hover:shadow-xl"
                >
                  <PlayIcon className="w-5 h-5" />
                  播放录音测试
                </button>
              )}
            </div>
          )}

          {/* Test Result Display */}
          {testResult && !micTestState && (
            <div className="p-4 bg-surface-secondary/50 rounded-macos-lg border border-border-secondary/50">
              <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-macos-blue rounded-full" />
                测试结果
              </h4>
              <p className="text-sm text-text-secondary">{testResult}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-border-primary/50 bg-surface-secondary/20">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-text-secondary hover:text-text-primary border border-border-secondary hover:border-border-primary rounded-macos-md transition-all duration-200 font-medium"
          >
            取消
          </button>
          <button
            onClick={saveSettings}
            className="px-6 py-2.5 bg-gradient-to-r from-macos-blue to-blue-600 text-white rounded-macos-md hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
          >
            完成设置
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;