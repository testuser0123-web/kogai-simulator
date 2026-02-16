'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { Kogai } from './Kogai';
import { useStore } from '@/store/useStore';
import { Settings, Maximize2, Minimize2, X, Video, Move, Loader2, Music } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export const Simulator = () => {
  const isPlaying = useStore(state => state.isPlaying);
  const bpm = useStore(state => state.bpm);
  const sequence = useStore(state => state.sequence);
  const patterns = useStore(state => state.patterns);
  const isFloating = useStore(state => state.isFloating);
  const floatingPosition = useStore(state => state.floatingPosition);
  const isRecording = useStore(state => state.isRecording);
  const audioUrl = useStore(state => state.audioUrl);
  const audioStartOffset = useStore(state => state.audioStartOffset);
  const currentSequenceIndex = useStore(state => state.currentSequenceIndex);
  
  const setIsRecording = useStore(state => state.setIsRecording);
  const toggleSettings = useStore(state => state.toggleSettings);
  const toggleFloating = useStore(state => state.toggleFloating);
  const setFloatingPosition = useStore(state => state.setFloatingPosition);
  const projects = useStore(state => state.projects);
  const currentProjectId = useStore(state => state.currentProjectId);
  
  const currentProjectName = projects.find(p => p.id === currentProjectId)?.name || 'kogai-project';

  const [renderProgress, setRenderProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying && !isRecording) {
      let seekTimeMs = audioStartOffset;
      for (let i = 0; i < currentSequenceIndex; i++) {
        const item = sequence[i];
        const p = patterns.find(pat => pat.id === item.patternId);
        if (p) seekTimeMs += p.steps * (60 / bpm / 8) * 1000;
      }
      
      audioRef.current.currentTime = seekTimeMs / 1000;
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, isRecording, audioUrl]);

  const loadFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    const ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  const handleRecord = async () => {
    if (!canvasRef.current || recorderRef.current?.state === 'recording') return;

    setRenderProgress(0);
    useStore.setState({ 
      isPlaying: false, 
      currentStep: 0, 
      currentSequenceIndex: 0, 
      elapsedTime: 0 
    });
    
    const formats = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    const mimeType = formats.find(f => MediaRecorder.isTypeSupported(f)) || 'video/webm';
    
    const videoStream = canvasRef.current.captureStream(60);
    const recorder = new MediaRecorder(videoStream, {
      mimeType,
      videoBitsPerSecond: 50000000
    });

    const recordStartTime = performance.now();
    chunksRef.current = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    
    recorder.onstop = async () => {
      if (chunksRef.current.length === 0) return;
      const recordEndTime = performance.now();
      const actualRecordedDurationSec = (recordEndTime - recordStartTime) / 1000;
      
      setIsProcessing(true);
      setProcessingStatus('Finalizing Master...');
      
      try {
        const ffmpeg = await loadFFmpeg();
        
        // 1. 映像の理想時間を計算
        let totalSteps = 0;
        sequence.forEach(item => {
          const p = patterns.find(pat => pat.id === item.patternId);
          if (p) totalSteps += p.steps;
        });
        const idealDurationSec = totalSteps / (bpm * 8 / 60);
        
        // 補正係数の計算 (安全装置付き)
        // 計算結果が異常(0やInfinity)な場合は、強制的に0.25(4倍速)を適用
        let correctionFactor = idealDurationSec / actualRecordedDurationSec;
        if (!isFinite(correctionFactor) || correctionFactor <= 0) {
            correctionFactor = 0.25;
        }

        // 2. 音声シーク位置 (マイナス回避)
        let audioSeekSec = audioStartOffset / 1000;
        for (let i = 0; i < currentSequenceIndex; i++) {
          const item = sequence[i];
          const p = patterns.find(pat => pat.id === item.patternId);
          if (p) audioSeekSec += (p.steps * (60 / bpm / 8) * 1000) / 1000;
        }
        audioSeekSec = Math.max(0, audioSeekSec);

        await ffmpeg.writeFile('input_v.webm', await fetchFile(new Blob(chunksRef.current, { type: mimeType })));
        
        const args = ['-i', 'input_v.webm'];

        if (audioUrl) {
          await ffmpeg.writeFile('input_a.mp3', await fetchFile(audioUrl));
          args.push('-ss', audioSeekSec.toFixed(3), '-i', 'input_a.mp3');
        }

        // フィルタ構築: 映像のみ速度変更(4倍速化)、音声はそのまま
        if (audioUrl) {
            args.push(
                '-filter_complex', `[0:v]setpts=${correctionFactor}*PTS[v]`,
                '-map', '[v]',
                '-map', '1:a',
                '-shortest'
            );
        } else {
            args.push('-vf', `setpts=${correctionFactor}*PTS`);
        }

        args.push(
          '-r', '60',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-preset', 'ultrafast', // 処理速度優先でエラー回避
          '-crf', '18'
        );
        
        if (audioUrl) {
          args.push('-c:a', 'aac', '-b:a', '192k');
        }

        args.push('output.mp4');

        await ffmpeg.exec(args);

        const data = await ffmpeg.readFile('output.mp4');
        // SharedArrayBuffer から通常の ArrayBuffer へコピーして型エラーと制約を回避
        const uint8Array = new Uint8Array(data as Uint8Array);
        const outputBlob = new Blob([uint8Array.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(outputBlob);
        
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
        const safeProjectName = currentProjectName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeProjectName}-${dateStr}-${timeStr}.mp4`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('FFmpeg processing failed:', err);
        alert('Mastering failed. Downloading RAW video (1/4 speed).');
        // 明示的にRAWであることをユーザーに伝える
        const rawBlob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(rawBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kogai-RAW-SLOW-${Date.now()}.webm`;
        a.click();
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
    };

    recorder.start();
    recorderRef.current = recorder;
    useStore.setState({ isPlaying: true });
  };

  useEffect(() => {
    if (isRecording) {
      handleRecord();
    } else if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
  }, [isRecording]);

  const getFloatingStyle = (): React.CSSProperties => {
    if (!isFloating) return {};
    if (floatingPosition) return { position: 'fixed', left: `${floatingPosition.x}px`, top: `${floatingPosition.y}px`, width: '400px', zIndex: 200 };
    return { position: 'fixed', bottom: '2rem', right: '2rem', width: '400px', zIndex: 200 };
  };

  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isFloating) return;
    setIsDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, [isFloating]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => { if (!isDragging) return; setFloatingPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); };
    const handleMouseUp = () => setIsDragging(false);
    if (isDragging) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging, setFloatingPosition]);

  return (
    <div ref={containerRef} style={getFloatingStyle()} className={`aspect-video bg-black rounded-3xl overflow-hidden relative group border-2 ${isFloating ? "shadow-[0_30px_100px_rgba(0,0,0,0.8)] border-blue-500/30" : "w-full max-w-5xl mx-auto z-10 border border-gray-800"} ${isDragging ? 'cursor-grabbing select-none' : isFloating ? 'cursor-grab' : ''}`} onMouseDown={handleMouseDown}>
      {audioUrl && <audio ref={audioRef} src={audioUrl} crossOrigin="anonymous" />}
      
      <Canvas 
        ref={canvasRef} 
        gl={{ 
          antialias: true, 
          preserveDrawingBuffer: true,
          powerPreference: "high-performance"
        }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera makeDefault position={[0, 7, 0]} />
        <OrbitControls target={[0, 0, 0]} enableDamping={false} enabled={!isFloating && !isRecording} />
        <color attach="background" args={['#020202']} />
        <fog attach="fog" args={['#020202', 5, 15]} />
        <ambientLight intensity={0.4} />
        <spotLight position={[5, 10, 5]} angle={0.3} penumbra={1} intensity={2} castShadow />
        <Kogai setRenderProgress={setRenderProgress} />
        <EffectComposer enableNormalPass={false}>
          <Bloom 
            luminanceThreshold={0.2} 
            luminanceSmoothing={0.9} 
            intensity={2.0} 
            mipmapBlur 
            resolutionScale={0.5}
          />
        </EffectComposer>
      </Canvas>

      {(isRecording || isProcessing) && (
        <div className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-12 text-center select-none backdrop-blur-sm">
          <Loader2 size={48} className="text-blue-500 animate-spin mb-6" />
          <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white mb-2">
            {isProcessing ? "Processing Master" : "Capturing Master"}
          </h3>
          {isProcessing ? (
            <p className="text-blue-400 font-mono text-xs mb-4">{processingStatus}</p>
          ) : (
            <>
              <div className="w-full max-w-xs bg-gray-900 h-1.5 rounded-full overflow-hidden mb-4 border border-white/5">
                <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${renderProgress}%` }} />
              </div>
              <span className="text-blue-400 font-mono font-black text-xl">{renderProgress}%</span>
              <button onClick={() => setIsRecording(false)} className="mt-8 px-5 py-1.5 bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white rounded-xl text-[9px] font-black uppercase border border-red-900/30 transition-all">Abort</button>
            </>
          )}
        </div>
      )}

      {!isRecording && !isProcessing && (
        <>
          <button onClick={(e) => { e.stopPropagation(); toggleFloating(); }} className={`absolute top-4 left-4 p-3 bg-black/60 hover:bg-blue-600 text-blue-400 hover:text-white backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl transition-all active:scale-95 group z-10 ${isFloating ? 'hover:bg-red-600 text-red-400' : ''}`} title={isFloating ? "Close Floating View" : "Float Simulator"}>{isFloating ? <X size={22} /> : <Maximize2 size={22} />}</button>
          <button onClick={(e) => { e.stopPropagation(); toggleSettings(); }} className="absolute top-4 right-4 p-3 bg-black/60 hover:bg-blue-600 text-blue-400 hover:text-white backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl transition-all active:scale-95 group z-10" title="Simulation Settings"><Settings size={22} className="group-hover:rotate-90 transition-transform duration-500" /></button>
          {audioUrl && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
              <Music size={12} className="text-blue-400" />
              <span className="text-[9px] font-black text-white/60 uppercase tracking-tighter">Audio Source Loaded</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};
