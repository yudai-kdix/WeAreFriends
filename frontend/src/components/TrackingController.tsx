// TrackingController.tsx
// 追跡モードを制御するコントローラーコンポーネント

import React, { useState, useEffect, useCallback, useRef } from "react";
import ObjectTracking, { isTracking } from "./ObjectTracking";
import ServerObjectTracking, { isServerTracking } from "./ServerObjectTracking";

// 追跡モードの型定義
export type TrackingMode = "local" | "server";

// コンポーネントのプロパティ定義
interface TrackingControllerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  detectedAnimal: string;
  onPositionUpdate: (
    position: { x: number; y: number; width: number; height: number } | null
  ) => void;
  clientId: string;
  trackingMode: TrackingMode;
  isEnabled: boolean; // 追跡が有効かどうか
  showDebugInfo?: boolean;
}

const TrackingController: React.FC<TrackingControllerProps> = ({
  videoRef,
  detectedAnimal,
  onPositionUpdate,
  clientId,
  trackingMode,
  isEnabled,
  showDebugInfo = false,
}) => {
  // 状態が変更されたときにログを出力（デバッグ用）
  useEffect(() => {
    if (showDebugInfo) {
      console.log(
        `TrackingController: モード=${trackingMode}, 有効=${isEnabled}`
      );
    }
  }, [trackingMode, isEnabled, showDebugInfo]);

  // 各モードが実際に有効かどうかの計算
  const isLocalActive = isEnabled && trackingMode === "local";
  const isServerActive = isEnabled && trackingMode === "server";

  // 検出結果のキャッシュ（一時的な通信切断時などのために）
  const [lastPosition, setLastPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // 追加：refを使用して最新のlastPositionを保持
  const lastPositionRef = useRef(lastPosition);

  // lastPositionが変更されたらrefも更新
  useEffect(() => {
    lastPositionRef.current = lastPosition;
  }, [lastPosition]);

  // handlePositionUpdateを修正
  const handlePositionUpdate = useCallback(
    (
      position: {
        x: number;
        y: number;
        width: number;
        height: number;
      } | null
    ) => {
      if (position) {
        setLastPosition(position);
      }

      // lastPositionの代わりにlastPositionRef.currentを使用
      onPositionUpdate(position || lastPositionRef.current);
    },
    [onPositionUpdate]
  );

  return (
    <>
      {/* ローカルCOCO-SSD追跡 - localモードで有効時のみレンダリング */}
      {isLocalActive && (
        <ObjectTracking
          videoRef={videoRef}
          detectedAnimal={detectedAnimal}
          onPositionUpdate={handlePositionUpdate}
          showDebugInfo={showDebugInfo}
        />
      )}

      {/* サーバーベース追跡 - serverモードのときのみ有効 */}
      <ServerObjectTracking
        videoRef={videoRef}
        detectedAnimal={detectedAnimal}
        onPositionUpdate={handlePositionUpdate}
        clientId={clientId}
        active={isServerActive}
        showDebugInfo={showDebugInfo}
      />

      {/* デバッグ情報（オプション） */}
      {showDebugInfo && (
        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            backgroundColor: "rgba(0,0,0,0.7)",
            color: "white",
            padding: 5,
            borderRadius: 5,
            fontSize: 12,
            zIndex: 1000,
          }}
        >
          <div>追跡モード: {trackingMode}</div>
          <div>有効状態: {isEnabled ? "有効" : "無効"}</div>
          <div>ローカル追跡: {isTracking ? "動作中" : "停止"}</div>
          <div>サーバー追跡: {isServerTracking ? "動作中" : "停止"}</div>
          <div>
            最終位置:
            {lastPosition
              ? `(${lastPosition.x.toFixed(2)}, ${lastPosition.y.toFixed(2)}, ${lastPosition.width.toFixed(2)}, ${lastPosition.height.toFixed(2)})`
              : "なし"}
          </div>
        </div>
      )}
    </>
  );
};

export default TrackingController;
