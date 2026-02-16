'use client';

import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Settings, X, Plus, ChevronUp, ChevronDown, Palette } from 'lucide-react';

export const SettingsPanel = () => {
  const { 
    isSettingsOpen, toggleSettings,
    numTubes, setNumTubes, isCircular, setIsCircular, brightnessMode, setBrightnessMode,
    colorPalette, addColorToPalette, renamePaletteColor, updatePaletteColorValue, deletePaletteColor
  } = useStore();

  const [newColorName, setNewColorName] = useState('New Color');
  const [newColorValue, setNewColorValue] = useState('#ffffff');

  if (!isSettingsOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity animate-in fade-in duration-300"
        onClick={toggleSettings}
      />

      {/* Slide-out Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0a0a0a] border-l border-gray-800 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-[101] overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="p-8">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-xl">
                <Settings size={20} className="text-white" />
              </div>
              <h2 className="text-lg font-black text-white uppercase tracking-[0.2em]">Global Config</h2>
            </div>
            <button 
              onClick={toggleSettings}
              className="p-2 hover:bg-gray-800 rounded-xl transition-colors text-gray-500 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-12">
            {/* Simulation Setup */}
            <section>
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Simulator Setup
              </h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-black rounded-2xl border border-gray-800">
                  <span className="text-xs font-bold text-gray-300">Tube Count</span>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setNumTubes(Math.max(1, numTubes - 1))} className="p-1 hover:text-blue-500 transition-colors"><ChevronDown size={20} /></button>
                    <span className="text-lg font-black font-mono text-blue-400">{numTubes}</span>
                    <button onClick={() => setNumTubes(Math.min(20, numTubes + 1))} className="p-1 hover:text-blue-500 transition-colors"><ChevronUp size={20} /></button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-black rounded-2xl border border-gray-800">
                  <span className="text-xs font-bold text-gray-300">Layout</span>
                  <div className="flex bg-gray-900 p-1 rounded-xl">
                    <button 
                      onClick={() => setIsCircular(false)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${!isCircular ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >Semi-Circle</button>
                    <button 
                      onClick={() => setIsCircular(true)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${isCircular ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >Full Circle</button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-black rounded-2xl border border-gray-800">
                  <span className="text-xs font-bold text-gray-300">Brightness Engine</span>
                  <div className="flex bg-gray-900 p-1 rounded-xl">
                    <button 
                      onClick={() => setBrightnessMode('normal')}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${brightnessMode === 'normal' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >Normal</button>
                    <button 
                      onClick={() => setBrightnessMode('max')}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${brightnessMode === 'max' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-gray-500 hover:text-gray-300'}`}
                    >Max Intensity</button>
                  </div>
                </div>
              </div>
            </section>

            {/* Color Palette */}
            <section>
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Color Palette
              </h3>
              
              <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                {colorPalette.map(c => (
                  <div key={c.id} className="group flex items-center gap-3 p-3 bg-black rounded-2xl border border-gray-800 transition-all hover:border-gray-600">
                    <input 
                      type="color" value={c.value}
                      onChange={(e) => updatePaletteColorValue(c.id, e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none"
                    />
                    <input 
                      type="text" value={c.name}
                      onChange={(e) => renamePaletteColor(c.id, e.target.value)}
                      className="flex-1 bg-transparent text-xs font-bold text-gray-300 outline-none"
                    />
                    <button 
                      onClick={() => deletePaletteColor(c.id)}
                      className="p-2 text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    ><X size={16} /></button>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-gray-900/50 rounded-2xl border border-gray-800 border-dashed">
                <div className="flex gap-2">
                  <input 
                    type="text" value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    className="flex-1 bg-black border border-gray-800 rounded-xl px-3 py-2 text-xs font-bold text-gray-300"
                    placeholder="Color Name"
                  />
                  <input 
                    type="color" value={newColorValue}
                    onChange={(e) => setNewColorValue(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer bg-black border border-gray-800 p-1"
                  />
                  <button 
                    onClick={() => { addColorToPalette(newColorName, newColorValue); setNewColorName('New Color'); }}
                    className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-600">
            <p className="text-[10px] font-black uppercase tracking-widest">Kogai Simulator V2.5</p>
          </div>
        </div>
      </div>
    </>
  );
};
