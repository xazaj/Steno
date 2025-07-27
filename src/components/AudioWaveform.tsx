import React, { useEffect, useRef } from 'react';
import { cn } from '../utils/cn';

interface AudioWaveformProps {
  isRecording: boolean;
  audioData?: Float32Array;
  className?: string;
  height?: number;
  showPlayhead?: boolean;
  playheadPosition?: number;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isRecording,
  audioData,
  className,
  height = 80,
  showPlayhead = false,
  playheadPosition = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  // const [waveformData, setWaveformData] = useState<number[]>([]);

  // Generate mock audio data for demonstration
  const generateMockWaveform = () => {
    const data = [];
    const time = Date.now() / 1000;
    
    for (let i = 0; i < 100; i++) {
      const frequency1 = 0.5 + Math.sin(time * 2 + i * 0.1) * 0.3;
      const frequency2 = 0.3 + Math.sin(time * 3 + i * 0.05) * 0.2;
      const amplitude = isRecording ? frequency1 * frequency2 : 0.1;
      data.push(amplitude);
    }
    
    return data;
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height: canvasHeight } = canvas;
    const centerY = canvasHeight / 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, canvasHeight);
    
    // Get current waveform data
    const currentData = audioData ? Array.from(audioData) : generateMockWaveform();
    
    // Draw waveform
    ctx.strokeStyle = isRecording ? '#007AFF' : '#8E8E93';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    
    const barWidth = width / currentData.length;
    
    for (let i = 0; i < currentData.length; i++) {
      const x = i * barWidth;
      const amplitude = Math.abs(currentData[i]) * (canvasHeight / 2) * 0.8;
      
      // Draw vertical bar
      ctx.moveTo(x, centerY - amplitude);
      ctx.lineTo(x, centerY + amplitude);
    }
    
    ctx.stroke();
    
    // Draw playhead if needed
    if (showPlayhead && playheadPosition >= 0) {
      const playheadX = (playheadPosition / 100) * width;
      
      ctx.strokeStyle = '#FF3B30';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, canvasHeight);
      ctx.stroke();
    }
    
    // Update waveform data for smooth animation (commented out for now)
    // setWaveformData(currentData);
  };

  const animate = () => {
    drawWaveform();
    
    if (isRecording) {
      animationRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    if (isRecording) {
      animate();
    } else {
      drawWaveform();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, audioData, playheadPosition, showPlayhead]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = height * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      
      drawWaveform();
    };

    updateCanvasSize();
    
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(canvas);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [height]);

  return (
    <div className={cn("relative overflow-hidden rounded-macos-md bg-surface-secondary", className)}>
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: `${height}px` }}
      />
      
      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-2 right-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-macos-red rounded-full animate-pulse" />
          <span className="text-xs text-text-secondary font-medium">LIVE</span>
        </div>
      )}
      
      {/* Gradient overlay for better visual effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-surface-secondary/20 pointer-events-none" />
    </div>
  );
};

export default AudioWaveform;