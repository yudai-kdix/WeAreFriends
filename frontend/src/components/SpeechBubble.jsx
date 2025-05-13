import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Box } from '@react-three/drei';
import * as THREE from 'three';

// 吹き出しコンポーネント
const SpeechBubble = ({ position = [0, 0, -1], message, animalName, color = '#ffffff' }) => {
  const groupRef = useRef();
  const rotationRef = useRef({ x: 0, y: 0, z: 0 });
  
  // 毎フレーム実行される処理
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // カメラの方向を常に向くように回転
    groupRef.current.lookAt(state.camera.position);
    
    // ゆっくりと上下に浮かぶアニメーション
    const time = state.clock.getElapsedTime();
    groupRef.current.position.y = position[1] + Math.sin(time) * 0.05;
    
    // 軽く揺れるアニメーション
    rotationRef.current.z = Math.sin(time * 0.5) * 0.05;
    groupRef.current.rotation.z = rotationRef.current.z;
  });

  return (
    <group ref={groupRef} position={position}>
      {/* 吹き出しの背景 */}
      <mesh>
        <boxGeometry args={[1.5, 0.8, 0.05]} />
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={0.7} 
          roughness={0.3}
        />
      </mesh>
      
      {/* 吹き出しの尖った部分 */}
      <mesh position={[0, -0.5, 0]}>
        <coneGeometry args={[0.2, 0.3, 3]} rotation={[0, 0, Math.PI]} />
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={0.7} 
          roughness={0.3}
        />
      </mesh>

      {/* 動物の名前 */}
      <Text
        position={[0, 0.25, 0.03]}
        fontSize={0.12}
        color="black"
        anchorX="center"
        anchorY="middle"
        font="/fonts/NotoSansJP-Bold.otf" // 日本語フォントを使用
      >
        {animalName || '動物'}
      </Text>
      
      {/* メッセージ本文 */}
      <Text
        position={[0, 0, 0.03]}
        fontSize={0.07}
        maxWidth={1.3}
        color="black"
        anchorX="center"
        anchorY="middle"
        font="/fonts/NotoSansJP-Regular.otf" // 日本語フォントを使用
      >
        {message || 'こんにちは！私について知りたいですか？'}
      </Text>
    </group>
  );
};

export default SpeechBubble;