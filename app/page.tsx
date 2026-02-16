'use client';

import { Simulator } from '@/components/simulator/Simulator';
import { PatternEditor } from '@/components/editor/PatternEditor';
import { SettingsPanel } from '@/components/editor/SettingsPanel';
import { SongSequencer } from '@/components/editor/SongSequencer';
import { ProjectManager } from '@/components/editor/ProjectManager';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-[1600px] mx-auto p-4 md:p-8 lg:p-12 space-y-12">
        {/* Header Section */}
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-600">
            KOGAI SIMULATOR
          </h1>
          <p className="text-[10px] md:text-xs font-black text-blue-500 uppercase tracking-[0.5em] pl-1">
            Professional 3D Performance Engine
          </p>
        </header>

        <ProjectManager />

        <div className="flex flex-col gap-12">
          {/* Main Visualizer */}
          <section className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
            <Simulator />
          </section>

          {/* Controls Area */}
          <div className="flex flex-col gap-12">
            <SongSequencer />
            <PatternEditor />
            
            <section className="bg-gray-900/20 p-8 rounded-3xl border border-gray-800/50 backdrop-blur-sm">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-6">User Guide</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="space-y-2">
                  <span className="text-blue-500 text-[10px] font-black uppercase">01. Sequence</span>
                  <p className="text-gray-400 text-xs leading-relaxed">Click steps to toggle light intensities. Use tools to shift or copy rows.</p>
                </div>
                <div className="space-y-2">
                  <span className="text-blue-500 text-[10px] font-black uppercase">02. Colors</span>
                  <p className="text-gray-400 text-xs leading-relaxed">Define a palette in Config, then assign colors to each tube in the editor.</p>
                </div>
                <div className="space-y-2">
                  <span className="text-blue-500 text-[10px] font-black uppercase">03. Timeline</span>
                  <p className="text-gray-400 text-xs leading-relaxed">Insert patterns into the Song Timeline to build a full performance.</p>
                </div>
                <div className="space-y-2">
                  <span className="text-blue-500 text-[10px] font-black uppercase">04. Motion</span>
                  <p className="text-gray-400 text-xs leading-relaxed">Enable 8-Figure motion for specific measures to add dynamic 3D rotation.</p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <footer className="pt-12 pb-8 border-t border-gray-900 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">© 2026 KOGAI SIMULATOR CORE ENGINE</span>
          <div className="flex gap-6">
            <span className="text-[10px] font-black text-gray-500 uppercase">System Stable</span>
            <span className="text-[10px] font-black text-blue-900 uppercase">High Precision Clock Active</span>
          </div>
        </footer>
      </div>

      {/* Global Modals / Overlays */}
      <SettingsPanel />
    </main>
  );
}
