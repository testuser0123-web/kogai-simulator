'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Plus, Trash2, FolderEdit, Download, Upload, X, Check, AlertTriangle } from 'lucide-react';

export const ProjectManager = () => {
  const { 
    projects, currentProjectId, addProject, deleteProject, renameProject, switchProject, importProject,
    bpm, numTubes, tubeLengths, tubeColorIds, colorPalette, isCircular, isLooping, brightnessMode, patterns, sequence,
    toggleSettings
  } = useStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeModal, setActiveModal] = useState<'add' | 'rename' | 'delete' | null>(null);
  const [modalInput, setModalValue] = useState('');

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveModal(null); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const openAddModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModalValue(`New Project ${projects.length + 1}`);
    setActiveModal('add');
  };

  const openRenameModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    const current = projects.find(p => p.id === currentProjectId);
    setModalValue(current?.name || '');
    setActiveModal('rename');
  };

  const confirmAction = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (activeModal === 'add') {
      addProject(modalInput);
    } else if (activeModal === 'rename') {
      renameProject(currentProjectId, modalInput);
    } else if (activeModal === 'delete') {
      deleteProject(currentProjectId);
    }
    setActiveModal(null);
  };

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentProject = projects.find(p => p.id === currentProjectId);
    if (!currentProject) return;
    const cleanPatterns = patterns.map(p => {
      const cleanData: { [key: number]: number[] } = {};
      Object.entries(p.data || {}).forEach(([key, val]) => {
        cleanData[parseInt(key)] = (val as any).map((item: any) => 
          (typeof item === 'object' && item !== null) ? (item.intensity || 0) : (item || 0)
        );
      });
      return { ...p, data: cleanData };
    });
    const exportData = { ...currentProject, bpm, numTubes, tubeLengths, tubeColorIds, colorPalette, isCircular, isLooping, brightnessMode, patterns: cleanPatterns, sequence };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name || 'kogai-project'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#0a0a0a] p-6 rounded-3xl border border-gray-800 shadow-2xl mb-8 relative z-30">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mr-2 whitespace-nowrap">Projects</h2>
          <div className="flex items-center gap-2">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={(e) => { e.stopPropagation(); switchProject(p.id); }}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all border-2 shrink-0 ${
                  currentProjectId === p.id ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-[#111] border-gray-800 text-gray-500 hover:border-gray-700'
                }`}
              >
                {p.name}
              </button>
            ))}
            <button onClick={openAddModal} className="p-2.5 bg-[#111] hover:bg-blue-600 border-2 border-dashed border-gray-800 rounded-2xl text-blue-500 hover:text-white transition-all shrink-0">
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-black/40 p-2 rounded-2xl border border-gray-800">
          <button onClick={openRenameModal} className="p-2.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition-all" title="Rename"><FolderEdit size={20} /></button>
          <div className="h-6 w-px bg-gray-800 mx-1"></div>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 text-xs font-black bg-gray-900 hover:bg-green-600 text-green-500 hover:text-white rounded-xl transition-all border border-green-900/30">EXPORT</button>
          <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="flex items-center gap-2 px-4 py-2 text-xs font-black bg-gray-900 hover:bg-blue-600 text-blue-500 hover:text-white rounded-xl transition-all border border-blue-900/30">IMPORT</button>
          <input type="file" ref={fileInputRef} onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
              try {
                const json = JSON.parse(event.target?.result as string);
                if (json.patterns) importProject(json);
              } catch (err) { console.error(err); }
            };
            reader.readAsText(file);
          }} accept=".json" className="hidden" />
          <div className="h-6 w-px bg-gray-800 mx-1"></div>
          <button onClick={(e) => { e.stopPropagation(); setActiveModal('delete'); }} disabled={projects.length <= 1} className="p-2.5 text-gray-700 hover:text-red-500 hover:bg-red-900/20 rounded-xl transition-all disabled:opacity-30"><Trash2 size={20} /></button>
        </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setActiveModal(null)} />
          <div className="relative bg-[#111] border border-gray-800 rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden p-8" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">
              {activeModal === 'add' ? 'New Project' : activeModal === 'rename' ? 'Rename' : 'Delete'}
            </h3>
            {activeModal === 'delete' ? (
              <div className="space-y-6 text-center">
                <AlertTriangle className="text-red-500 mx-auto" size={48} />
                <p className="text-sm font-bold text-gray-300">Are you sure you want to delete this project?</p>
                <div className="flex gap-2">
                  <button onClick={() => setActiveModal(null)} className="flex-1 py-3 bg-gray-800 rounded-xl text-xs font-black uppercase">Cancel</button>
                  <button onClick={confirmAction} className="flex-1 py-3 bg-red-600 rounded-xl text-xs font-black uppercase">Delete</button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <input type="text" value={modalInput} onChange={(e) => setModalValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && confirmAction()} autoFocus className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500" />
                <div className="flex gap-2">
                  <button onClick={() => setActiveModal(null)} className="flex-1 py-3 bg-gray-800 rounded-xl text-xs font-black uppercase">Cancel</button>
                  <button onClick={confirmAction} className="flex-1 py-3 bg-blue-600 rounded-xl text-xs font-black uppercase">{activeModal === 'add' ? 'Create' : 'Save'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
