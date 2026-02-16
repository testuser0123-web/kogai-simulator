'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore, TubeLength } from '@/store/useStore';
import * as THREE from 'three';

const getTubeHeight = (length: TubeLength) => {
  switch (length) {
    case 'short': return 1.8;
    case 'long': return 3.2;
    default: return 2.5;
  }
};

const HANDLE_LENGTH = 0.7;

// 録画設定: 1フレームあたりの進行時間
// 60fps動画として出力するが、中身は0.25倍速（4倍スロー）にする
// つまり、1フレームで進む時間は 1秒 / 60フレーム * 0.25
const RECORDING_STEP_MS = (1000 / 60) * 0.25;

interface KogaiProps {
  setRenderProgress: (progress: number) => void;
  // videoWriterRefは削除
}

export const Kogai = ({ setRenderProgress }: KogaiProps) => {
  const numTubes = useStore(state => state.numTubes);
  const tubeLengths = useStore(state => state.tubeLengths);
  const tubeColorIds = useStore(state => state.tubeColorIds);
  const colorPalette = useStore(state => state.colorPalette);
  const isCircular = useStore(state => state.isCircular);
  
  const groupRef = useRef<THREE.Group>(null);
  const lightRefs = useRef<THREE.PointLight[]>([]);
  const materialRefs = useRef<THREE.MeshStandardMaterial[]>([]);

  const stateRef = useRef({
    currentStep: 0,
    currentSequenceIndex: 0,
    brightnessMode: 'normal' as 'normal' | 'max',
    bpm: 120,
    isRecording: false,
    isPlaying: false,
    isLooping: true,
    sequence: [] as any[],
    patterns: [] as any[],
    currentPatternId: '',
    elapsedTime: 0
  });

  const startTimeRef = useRef(0);
  const patternStartTimeRef = useRef(0);
  const lastStepRef = useRef(-1);
  const lastTimeUpdateRef = useRef(0);
  
  // 録画用の累積時間管理
  const recordingElapsedMsRef = useRef(0);

  useEffect(() => {
    const unsub = useStore.subscribe((state) => {
      const prevIsPlaying = stateRef.current.isPlaying;
      
      stateRef.current = {
        ...stateRef.current,
        brightnessMode: state.brightnessMode,
        bpm: state.bpm,
        isRecording: state.isRecording,
        isPlaying: state.isPlaying,
        isLooping: state.isLooping,
        sequence: state.sequence,
        patterns: state.patterns,
        currentPatternId: state.currentPatternId,
        currentStep: state.currentStep,
        currentSequenceIndex: state.currentSequenceIndex,
        elapsedTime: state.elapsedTime
      };

      if (state.isPlaying && !prevIsPlaying) {
        startTimeRef.current = performance.now();
        patternStartTimeRef.current = 0;
        lastStepRef.current = -1;
        recordingElapsedMsRef.current = 0;
      }
    });
    return unsub;
  }, []);

  const tubes = useMemo(() => {
    const arr = [];
    const angleRange = isCircular ? Math.PI * 2 : Math.PI;
    for (let i = 0; i < numTubes; i++) {
      const angle = (i / (numTubes - (isCircular ? 0 : 1))) * angleRange - (isCircular ? 0 : Math.PI / 2) + Math.PI;
      const totalLength = getTubeHeight(tubeLengths[i] || 'normal');
      const lightLength = Math.max(0.1, totalLength - HANDLE_LENGTH);
      
      const colorId = tubeColorIds[i] || (colorPalette[0]?.id);
      const colorOption = colorPalette.find(c => c.id === colorId) || colorPalette[0];
      const colorValue = colorOption?.value || '#ffffff';
      
      arr.push({ angle, index: i, totalLength, lightLength, color: new THREE.Color(colorValue) });
    }
    return arr;
  }, [numTubes, isCircular, tubeLengths, tubeColorIds, colorPalette]);

  useFrame((state) => {
    const s = stateRef.current;
    if (!s.isPlaying) return;

    // --- 1. 時間計算 ---
    let simulatedElapsedMs: number;
    
    if (s.isRecording) {
      // 録画中: フレームごとに固定時間だけ進める（PC負荷に依存しない）
      // 1回の描画で 0.25フレーム分しか進まない -> 4倍スローになる
      recordingElapsedMsRef.current += RECORDING_STEP_MS;
      simulatedElapsedMs = recordingElapsedMsRef.current;
    } else {
      // 通常時: 実時間
      if (startTimeRef.current === 0) startTimeRef.current = performance.now();
      simulatedElapsedMs = performance.now() - startTimeRef.current;
    }

    // UIへの通知（100msごと）
    if (simulatedElapsedMs - lastTimeUpdateRef.current > 100) {
      useStore.getState().setElapsedTime(simulatedElapsedMs / 1000);
      lastTimeUpdateRef.current = simulatedElapsedMs;
    }

    const pattern = s.patterns.find(p => p.id === s.currentPatternId);
    if (!pattern) return;

    const stepDuration = (60 / s.bpm / 8) * 1000;
    
    // 録画進捗
    if (s.isRecording) {
      let totalTargetMs = 0;
      s.sequence.forEach(item => {
        const p = s.patterns.find(pat => pat.id === item.patternId);
        if (p) totalTargetMs += p.steps * stepDuration;
      });
      setRenderProgress(Math.min(100, Math.floor((simulatedElapsedMs / totalTargetMs) * 100)));
    }

    const msInPattern = simulatedElapsedMs - patternStartTimeRef.current;
    const currentStepIndex = Math.floor(msInPattern / stepDuration);

    // --- 2. シーケンス進行 ---
    if (currentStepIndex >= pattern.steps) {
      const isLast = s.currentSequenceIndex === s.sequence.length - 1;
      if (isLast && (s.isRecording || !s.isLooping)) {
        if (s.isRecording) {
          useStore.getState().setIsRecording(false);
        }
        useStore.getState().stopPlay();
        startTimeRef.current = 0;
      } else {
        const nextIndex = (s.currentSequenceIndex + 1) % s.sequence.length;
        patternStartTimeRef.current += pattern.steps * stepDuration;
        useStore.getState().setCurrentSequenceIndex(nextIndex);
      }
    } else if (currentStepIndex !== lastStepRef.current) {
      useStore.getState().setCurrentStep(Math.max(0, currentStepIndex));
      lastStepRef.current = currentStepIndex;
    }

    // --- 3. 描画更新 ---
    const currentSeqItem = s.sequence[s.currentSequenceIndex];
    const motionMode = currentSeqItem?.motionMode || 'static';
    
    if (groupRef.current) {
      if (motionMode === 'eight') {
        const measureDuration = 240 / s.bpm;
        const t = (simulatedElapsedMs % (measureDuration * 1000)) / (measureDuration * 1000) * Math.PI * 2;
        groupRef.current.rotation.set(Math.sin(t * 2) * 0.5, Math.sin(t) * 1.2, Math.cos(t) * 1.5);
        groupRef.current.position.y = 0.5 + Math.sin(t * 2) * 0.2;
      } else {
        groupRef.current.rotation.set(0, 0, 0);
        groupRef.current.position.y = 0.1;
      }
    }

    const isMax = s.brightnessMode === 'max';
    const emissiveMult = isMax ? 8 : 3;
    const lightMult = isMax ? 40 : 15;
    const darkColor = new THREE.Color('#222');
    
    for (let i = 0; i < tubes.length; i++) {
      const tube = tubes[i];
      const tubeData = pattern.data[tube.index];
      const intensity = tubeData ? (tubeData[s.currentStep] || 0) : 0;
      
      const mat = materialRefs.current[i];
      if (mat) {
        mat.emissiveIntensity = intensity * emissiveMult;
        mat.emissive.copy(tube.color);
        mat.color.copy(intensity > 0 ? tube.color : darkColor);
      }
      
      const light = lightRefs.current[i];
      if (light) {
        light.intensity = intensity * lightMult;
        light.color.copy(tube.color);
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0.1, 0]}>
      {tubes.map((tube, i) => (
        <group key={tube.index} rotation={[0, -tube.angle, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, HANDLE_LENGTH / 2]}>
            <cylinderGeometry args={[0.06, 0.06, HANDLE_LENGTH, 16]} />
            <meshStandardMaterial color="#111" roughness={0.5} metalness={0.8} />
          </mesh>

          <group position={[0, 0, HANDLE_LENGTH + tube.lightLength / 2]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.05, 0.05, tube.lightLength, 16]} />
              <meshStandardMaterial 
                ref={(el) => { if (el) materialRefs.current[i] = el; }}
                color="#222" 
                emissive={tube.color} 
                emissiveIntensity={0} 
              />
            </mesh>
            <pointLight 
              ref={(el) => { if (el) lightRefs.current[i] = el; }}
              position={[0, 0, tube.lightLength / 2]} 
              intensity={0} 
              color={tube.color} 
              distance={5}
              decay={2}
            />
          </group>
        </group>
      ))}
      
      <mesh>
        <cylinderGeometry args={[0.3, 0.4, 0.2, 32]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.2} metalness={0.9} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#020202" roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  );
};
