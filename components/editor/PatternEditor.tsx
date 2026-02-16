'use client';

import React, { useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight, X, Trash2, Plus } from 'lucide-react';

export const PatternEditor = () => {
  const { 
    patterns, currentPatternId, setCurrentPatternId, addPattern, renamePattern, deletePattern,
    numTubes, tubeLengths, setTubeLength, tubeColorIds, setTubeColorId, colorPalette,
    updatePatternStep, copyTubeData, shiftTubeData, clearTubeData,
    currentStep, bpm, setBpm
  } = useStore();

  const playheadRef = useRef<HTMLDivElement>(null);

  const currentPattern = patterns.find(p => p.id === currentPatternId);

  // RIGID CONSTANTS
  const W_TUBE = 50;
  const W_TOOLS = 160;
  const W_COLOR = 90;
  const W_LEN = 110;
  const W_STEP = 40;
  const H_ROW = 50;
  const H_HEADER = 36;

  const LEFT_TUBE = 0;
  const LEFT_TOOLS = W_TUBE;
  const LEFT_COLOR = W_TUBE + W_TOOLS;
  const LEFT_LEN = W_TUBE + W_TOOLS + W_COLOR;
  const LEFT_STEPS = W_TUBE + W_TOOLS + W_COLOR + W_LEN;

  useEffect(() => {
    if (playheadRef.current) {
      playheadRef.current.style.transform = `translateX(${LEFT_STEPS + currentStep * W_STEP}px)`;
    }
  }, [currentStep, LEFT_STEPS, W_STEP]);

  // Conditional rendering MUST happen after all hooks
  if (!currentPattern) return (
    <div className="p-12 bg-black text-gray-600 rounded-2xl mt-8 border border-gray-800 text-center font-black uppercase tracking-widest">
      Select or create a pattern to start editing
    </div>
  );

  const steps = Array.from({ length: currentPattern.steps }, (_, i) => i);
  const tubes = Array.from({ length: numTubes }, (_, i) => i);

  return (
    <div className="p-4 md:p-6 bg-black text-white rounded-2xl mt-8 border border-gray-800 shadow-2xl w-full max-w-full overflow-hidden">
      
      {/* Pattern Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar border-b border-gray-800">
        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest mr-4 text-center">Step Sequencer</span>
        <div className="flex items-center gap-1">
          {patterns.map(p => (
            <button
              key={p.id}
              onClick={() => setCurrentPatternId(p.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap border-2 ${
                currentPatternId === p.id 
                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg' 
                  : 'bg-[#111] border-transparent text-gray-500 hover:bg-[#222]'
              }`}
            >
              {p.name}
            </button>
          ))}
          <button onClick={addPattern} className="p-2 bg-[#111] hover:bg-[#222] rounded-xl text-blue-400 border-2 border-dashed border-gray-800 ml-1">
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Editor Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-6">
          <div className="bg-[#111] px-5 py-2.5 rounded-2xl border border-gray-800 flex items-center gap-3 font-mono">
            <span className="text-gray-600 text-[10px] font-black uppercase">Playhead</span>
            <span className="text-xl font-black text-blue-400 leading-none">{(currentStep + 1).toString().padStart(2, '0')}</span>
            <span className="text-gray-800 text-lg">/</span>
            <span className="text-gray-600">{currentPattern.steps}</span>
          </div>
          
          <div className="bg-[#0a0a0a] px-4 py-2 rounded-2xl border border-gray-800 flex items-center gap-3">
            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Tempo</span>
            <input 
              type="number" value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-16 bg-black border border-gray-800 rounded-xl px-1 py-1 text-center font-black font-mono text-blue-500 text-base outline-none"
            />
            <span className="text-xs font-bold text-gray-700">BPM</span>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#0a0a0a] p-2 rounded-2xl border border-gray-800">
          <input 
            type="text" value={currentPattern.name}
            onChange={(e) => renamePattern(currentPatternId, e.target.value)}
            className="bg-black border border-gray-800 rounded-xl px-4 py-2 text-xs font-bold text-gray-300 w-40 focus:border-blue-500 outline-none"
            placeholder="Pattern Name"
          />
          <button onClick={() => { if (window.confirm('Delete pattern?')) deletePattern(currentPatternId); }} disabled={patterns.length <= 1} className="p-2.5 text-gray-600 hover:text-red-500">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Grid Sequencer */}
      <div className="relative border-2 border-gray-800 rounded-2xl overflow-hidden bg-[#050505]">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-black">
          <div className="grid relative" style={{ gridTemplateColumns: `${W_TUBE}px ${W_TOOLS}px ${W_COLOR}px ${W_LEN}px repeat(${currentPattern.steps}, ${W_STEP}px)`, width: 'max-content' }}>
            <div ref={playheadRef} className="absolute top-0 bottom-0 z-20 pointer-events-none bg-blue-500/15 border-x-2 border-blue-400/40" style={{ width: `${W_STEP}px`, left: 0, gridRow: `1 / ${tubes.length + 2}` }} />

            <div className="sticky top-0 z-50 bg-[#151515] border-b-2 border-gray-800 flex items-center justify-center text-[10px] font-black text-gray-600 shadow-sm" style={{ gridColumn: 1, height: H_HEADER, left: LEFT_TUBE, position: 'sticky' }}>ID</div>
            <div className="sticky top-0 z-50 bg-[#151515] border-b-2 border-gray-800 flex items-center justify-center text-[10px] font-black text-gray-600 shadow-sm" style={{ gridColumn: 2, height: H_HEADER, left: LEFT_TOOLS, position: 'sticky' }}>TOOLS</div>
            <div className="sticky top-0 z-50 bg-[#151515] border-b-2 border-gray-800 flex items-center justify-center text-[10px] font-black text-gray-600 shadow-sm" style={{ gridColumn: 3, height: H_HEADER, left: LEFT_COLOR, position: 'sticky' }}>COLOR</div>
            <div className="sticky top-0 z-50 bg-[#151515] border-b-2 border-gray-800 flex items-center justify-center text-[10px] font-black text-gray-600 shadow-sm" style={{ gridColumn: 4, height: H_HEADER, left: LEFT_LEN, position: 'sticky' }}>LENGTH</div>
            
            {steps.map(step => (
              <div key={step} className={`bg-[#151515] border-b-2 border-gray-800 flex items-center justify-center text-[10px] font-black font-mono text-gray-600 border-r border-gray-800/50 ${step % 8 === 0 ? 'border-l border-gray-700' : ''}`} style={{ gridColumn: step + 5, height: H_HEADER }}>{(step + 1).toString().padStart(2, '0')}</div>
            ))}

            {tubes.map((tubeIdx) => (
              <React.Fragment key={tubeIdx}>
                <div className="bg-[#111] border-b border-gray-900 flex items-center justify-center text-[11px] font-black text-gray-500 border-r border-gray-800 shadow-md" style={{ gridColumn: 1, gridRow: tubeIdx + 2, height: H_ROW, left: LEFT_TUBE, position: 'sticky', zIndex: 40 }}>#{tubeIdx + 1}</div>
                <div className="bg-[#111] border-b border-gray-900 flex items-center justify-center gap-1 px-2 border-r border-gray-800 shadow-md" style={{ gridColumn: 2, gridRow: tubeIdx + 2, height: H_ROW, left: LEFT_TOOLS, position: 'sticky', zIndex: 40 }}>
                  <button onClick={() => copyTubeData(currentPatternId, tubeIdx, tubeIdx - 1)} className="p-2 hover:bg-[#222] rounded-lg text-gray-600 hover:text-blue-400 transition-colors"><ArrowUp size={16}/></button>
                  <button onClick={() => copyTubeData(currentPatternId, tubeIdx, tubeIdx + 1)} className="p-2 hover:bg-[#222] rounded-lg text-gray-600 hover:text-blue-400 transition-colors"><ArrowDown size={16}/></button>
                  <button onClick={() => shiftTubeData(currentPatternId, tubeIdx, 'left')} className="p-2 hover:bg-[#222] rounded-lg text-gray-600 hover:text-cyan-400 transition-colors"><ChevronLeft size={16}/></button>
                  <button onClick={() => shiftTubeData(currentPatternId, tubeIdx, 'right')} className="p-2 hover:bg-[#222] rounded-lg text-gray-600 hover:text-cyan-400 transition-colors"><ChevronRight size={16}/></button>
                  <button onClick={() => clearTubeData(currentPatternId, tubeIdx)} className="p-2 hover:bg-red-900/20 rounded-lg text-gray-600 hover:text-red-500 transition-colors"><X size={16}/></button>
                </div>
                <div className="bg-[#111] border-b border-gray-900 flex items-center justify-center px-2 border-r border-gray-800 shadow-md" style={{ gridColumn: 3, gridRow: tubeIdx + 2, height: H_ROW, left: LEFT_COLOR, position: 'sticky', zIndex: 40 }}>
                  <select 
                    value={tubeColorIds[tubeIdx] || (colorPalette[0]?.id || '')}
                    onChange={(e) => setTubeColorId(tubeIdx, e.target.value)}
                    className="w-full bg-black border border-gray-800 rounded text-[9px] font-bold text-gray-400 outline-none p-1 truncate"
                    style={{ color: colorPalette.find(c => c.id === (tubeColorIds[tubeIdx] || (colorPalette[0]?.id || '')))?.value }}
                  >
                    {colorPalette.map(c => (
                      <option key={c.id} value={c.id} style={{ color: c.value }}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="bg-[#111] border-b border-gray-900 flex items-center justify-center px-2 border-r border-gray-800 shadow-md" style={{ gridColumn: 4, gridRow: tubeIdx + 2, height: H_ROW, left: LEFT_LEN, position: 'sticky', zIndex: 40 }}>
                  <div className="flex bg-black rounded-lg p-0.5 border border-gray-800 w-full overflow-hidden">
                    {(['short', 'normal', 'long'] as const).map(l => (
                      <button key={l} onClick={() => setTubeLength(tubeIdx, l)} className={`flex-1 text-[9px] font-black rounded py-1.5 transition-all ${(tubeLengths[tubeIdx] || 'normal') === l ? 'bg-gray-800 text-white' : 'text-gray-600 hover:text-gray-400'}`}>{l[0].toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                {steps.map(stepIdx => {
                  const rawValue = currentPattern.data[tubeIdx]?.[stepIdx];
                  const intensity = typeof rawValue === 'object' ? (rawValue as any).intensity : (rawValue || 0);
                  
                  return (
                    <button key={stepIdx} onClick={() => updatePatternStep(currentPatternId!, tubeIdx, stepIdx, intensity > 0 ? 0 : 1)} className={`border-b border-gray-900 border-r flex items-center justify-center transition-colors ${intensity > 0 ? 'bg-cyan-500 shadow-[inset_0_0_10px_rgba(255,255,255,0.3)]' : (Math.floor(stepIdx / 8) % 2 === 0 ? 'bg-[#0a0a0a]' : 'bg-[#0f0f0f]')} ${stepIdx % 8 === 0 ? 'border-l-2 border-l-gray-800' : ''} hover:brightness-125`} style={{ gridColumn: stepIdx + 5, gridRow: tubeIdx + 2, height: H_ROW }}>{intensity > 0 && <div className="w-full h-full bg-white/10 blur-[1px]" />}</button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
