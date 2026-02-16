'use client';

import React, { useEffect, useRef } from 'react';
import { useStore, MotionMode } from '@/store/useStore';
import { Plus, X, ArrowRight, Play, Pause, ChevronRight, Move, Square, Repeat, SkipBack, SkipForward, Video } from 'lucide-react';

export const SongSequencer = () => {
  const { 
    patterns, sequence, insertToSequence, removeFromSequence, 
    currentSequenceIndex, setCurrentSequenceIndex, isPlaying, togglePlay, setSequenceMotionMode,
    isLooping, setIsLooping, setCurrentStep, setCurrentPatternId, isRecording, setIsRecording
  } = useStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  const handleReturnToStart = () => {
    if (sequence.length > 0) {
      setCurrentSequenceIndex(0);
      setCurrentStep(0);
      setCurrentPatternId(sequence[0].patternId);
    }
  };

  const handleSkipToEnd = () => {
    if (sequence.length > 0) {
      const lastIndex = sequence.length - 1;
      setCurrentSequenceIndex(lastIndex);
      setCurrentStep(0);
      setCurrentPatternId(sequence[lastIndex].patternId);
    }
  };

  const handleStartRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }
    
    // 1. Prepare for recording
    setIsRecording(true);
    setCurrentSequenceIndex(0);
    setCurrentStep(0);
    setCurrentPatternId(sequence[0]?.patternId || '');
    useStore.setState({ isPlaying: false, elapsedTime: 0 });
    // The Simulator's internal logic will now take over via useEffect and handleRecord
  };

  // Robust Horizontal-Only Auto-scroll
  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const element = activeRef.current;
      const elementOffset = element.offsetLeft;
      const elementWidth = element.offsetWidth;
      const containerWidth = container.offsetWidth;
      const scrollTo = elementOffset - (containerWidth / 2) + (elementWidth / 2);
      container.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  }, [currentSequenceIndex]);

  return (
    <div className="p-6 bg-[#0a0a0a] text-white rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
      {/* Header with Transport Controls */}
      <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-6">
        <div className="flex items-center gap-6">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em]">Song Timeline</h2>
          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-gray-800 shadow-inner">
            <button 
              onClick={handleReturnToStart}
              className="p-2.5 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl transition-all border border-gray-800 active:scale-90"
              title="Return to Start"
            >
              <SkipBack size={20} fill="currentColor" />
            </button>

            <button 
              onClick={togglePlay}
              className={`flex items-center gap-3 px-8 py-2.5 rounded-xl font-black text-base transition-all transform active:scale-95 shadow-xl ${
                isPlaying ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {isPlaying ? <><Pause size={20} fill="currentColor" /> STOP</> : <><Play size={20} fill="currentColor" /> PLAY</>}
            </button>

            <button 
              onClick={handleSkipToEnd}
              className="p-2.5 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl transition-all border border-gray-800 active:scale-90"
              title="Skip to End"
            >
              <SkipForward size={20} fill="currentColor" />
            </button>

            <div className="h-8 w-px bg-gray-800 mx-1" />

            <button
              onClick={handleStartRecording}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all transform active:scale-95 shadow-xl border-2 ${
                isRecording 
                  ? 'bg-red-600 border-white/20 text-white animate-pulse' 
                  : 'bg-gray-900 border-gray-800 text-red-500 hover:bg-red-900/20'
              }`}
              title="Record to MP4/WebM"
            >
              <Video size={18} fill={isRecording ? "currentColor" : "none"} />
              {isRecording ? "RECORDING..." : "RECORD VIDEO"}
            </button>
            
            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`p-2.5 rounded-xl transition-all border-2 ${
                isLooping 
                  ? 'bg-green-900/20 border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                  : 'bg-gray-900/50 border-gray-800 text-gray-600'
              }`}
              title={isLooping ? "Looping Enabled" : "Looping Disabled"}
            >
              <Repeat size={20} strokeWidth={3} />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-2xl border border-gray-800">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Live Engine Active</span>
        </div>
      </div>
      
      {/* Pattern Picker */}
      <div className="mb-10 bg-black/20 p-4 rounded-2xl border border-gray-800/50">
        <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-4 flex items-center gap-2">
          <ChevronRight size={12} /> Insert Pattern after current:
        </div>
        <div className="flex flex-wrap gap-2">
          {patterns.map(p => (
            <button
              key={p.id}
              onClick={() => insertToSequence(p.id)}
              className="group flex items-center gap-3 px-5 py-2.5 bg-[#111] hover:bg-blue-600 border border-gray-800 hover:border-blue-400 rounded-2xl transition-all active:scale-95"
            >
              <span className="text-xs font-black text-gray-400 group-hover:text-white">{p.name}</span>
              <Plus size={16} className="text-blue-500 group-hover:text-white" />
            </button>
          ))}
        </div>
      </div>

      {/* The Timeline */}
      <div className="relative">
        <div ref={containerRef} className="flex items-center gap-4 overflow-x-auto pb-10 pt-4 scrollbar-thin scrollbar-thumb-gray-800">
          {sequence.map((item, index) => {
            const pattern = patterns.find(p => p.id === item.patternId);
            const isActive = currentSequenceIndex === index;
            const isPlayingNow = isActive && isPlaying;
            
            return (
              <div key={`${item.patternId}-${index}`} className="flex items-center shrink-0">
                <div 
                  ref={isActive ? activeRef : null}
                  className={`relative group cursor-pointer flex flex-col w-48 p-6 rounded-[2.5rem] border-4 transition-all duration-300 ${
                    isPlayingNow 
                      ? 'bg-blue-600 scale-110 -translate-y-2 border-blue-300 shadow-[0_25px_50px_rgba(37,99,235,0.5)] z-10' 
                      : isActive 
                        ? 'bg-[#222] border-blue-500/50 scale-105 shadow-xl'
                        : 'bg-[#111] border-gray-800 hover:border-gray-600'
                  }`}
                  onClick={() => setCurrentSequenceIndex(index)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[10px] font-black ${isPlayingNow ? 'text-blue-100' : 'text-gray-600'}`}>
                      M-{String(index + 1).padStart(2, '0')}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFromSequence(index); }}
                      className={`p-1.5 rounded-xl transition-all ${
                        isPlayingNow ? 'text-blue-200 hover:bg-white/20' : 'text-gray-700 hover:text-red-500 hover:bg-red-900/20'
                      }`}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <span className={`text-base font-black truncate mb-3 ${isPlayingNow ? 'text-white' : 'text-gray-300'}`}>
                    {pattern?.name || 'Deleted'}
                  </span>
                  
                  <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 mt-auto">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSequenceMotionMode(index, 'static'); }}
                      className={`flex-1 flex justify-center py-1.5 rounded-lg transition-all ${item.motionMode === 'static' ? 'bg-gray-700 text-white shadow-inner' : 'text-gray-600 hover:text-gray-400'}`}
                      title="Static"
                    >
                      <Square size={14} fill={item.motionMode === 'static' ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSequenceMotionMode(index, 'eight'); }}
                      className={`flex-1 flex justify-center py-1.5 rounded-lg transition-all ${item.motionMode === 'eight' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-600 hover:text-gray-400'}`}
                      title="8-Figure Motion"
                    >
                      <Move size={14} />
                    </button>
                  </div>

                  {isPlayingNow && (
                    <div className="absolute inset-x-8 bottom-4 h-1 bg-blue-300/30 rounded-full overflow-hidden mt-4">
                      <div className="h-full bg-white animate-pulse" style={{ width: '100%' }} />
                    </div>
                  )}
                </div>

                {index < sequence.length - 1 && (
                  <div className={`mx-1 transition-colors ${isPlayingNow ? 'text-blue-500 animate-pulse' : 'text-gray-800'}`}>
                    <ArrowRight size={24} strokeWidth={4} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
