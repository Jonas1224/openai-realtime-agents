import React from "react";
import { SessionStatus } from "@/app/types";
import Timer from './Timer';

interface BottomToolbarProps {
  sessionStatus: SessionStatus;
  onToggleConnection: () => void;
  isPTTActive: boolean;
  setIsPTTActive: (active: boolean) => void;
  isPTTUserSpeaking: boolean;
  handleTalkButtonDown: () => void;
  handleTalkButtonUp: () => void;
  isEventsPaneExpanded: boolean;
  setIsEventsPaneExpanded: (expanded: boolean) => void;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (enabled: boolean) => void;
  isVideoExpanded: boolean;
  setIsVideoExpanded: (expanded: boolean) => void;
  isTranslationEnabled: boolean;
  setIsTranslationEnabled: (enabled: boolean) => void;
}

function BottomToolbar({
  sessionStatus,
  onToggleConnection,
  isPTTActive,
  setIsPTTActive,
  isPTTUserSpeaking,
  handleTalkButtonDown,
  handleTalkButtonUp,
  isEventsPaneExpanded,
  setIsEventsPaneExpanded,
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
  isVideoExpanded,
  setIsVideoExpanded,
  isTranslationEnabled,
  setIsTranslationEnabled,
}: BottomToolbarProps) {
  const isConnected = sessionStatus === "CONNECTED";

  return (
    <div className="flex items-center px-4 py-2 bg-white border-t border-gray-200">
      <div className="flex-1 flex justify-center">
        <div className="flex items-center gap-8">
          <button
            onClick={onToggleConnection}
            className={
              "py-1 px-4 rounded-full " +
              (isConnected
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-green-100 text-green-700 hover:bg-green-200")
            }
          >
            {isConnected ? "Disconnect" : "Connect"}
          </button>

          <div className="flex flex-row items-center gap-2">
            <input
              id="push-to-talk"
              type="checkbox"
              checked={isPTTActive}
              onChange={e => setIsPTTActive(e.target.checked)}
              disabled={!isConnected}
              className="w-4 h-4"
            />
            <label htmlFor="push-to-talk" className="flex items-center cursor-pointer">
              按住说话
            </label>
            <button
              onMouseDown={handleTalkButtonDown}
              onMouseUp={handleTalkButtonUp}
              onTouchStart={handleTalkButtonDown}
              onTouchEnd={handleTalkButtonUp}
              disabled={!isPTTActive}
              className={
                (isPTTUserSpeaking ? "bg-gray-300" : "bg-gray-200") +
                " py-1 px-4 cursor-pointer rounded-full" +
                (!isPTTActive ? " bg-gray-100 text-gray-400" : "")
              }
            >
              说话
            </button>
          </div>

          <div className="flex flex-row items-center gap-2">
            <input
              id="audio-playback"
              type="checkbox"
              checked={isAudioPlaybackEnabled}
              onChange={e => setIsAudioPlaybackEnabled(e.target.checked)}
              disabled={!isConnected}
              className="w-4 h-4"
            />
            <label htmlFor="audio-playback" className="flex items-center cursor-pointer">
              语音播放
            </label>
          </div>


          <div className="flex flex-row items-center gap-2">
            <input
              id="logs-expanded"
              type="checkbox"
              checked={isEventsPaneExpanded}
              onChange={e => setIsEventsPaneExpanded(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="logs-expanded" className="flex items-center cursor-pointer">
              Show logs
            </label>
          </div>

          <div className="flex flex-row items-center gap-2">
            <input
              id="video-expanded"
              type="checkbox"
              checked={isVideoExpanded}
              onChange={e => setIsVideoExpanded(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="video-expanded" className="flex items-center cursor-pointer">
              录像
            </label>
          </div>

          <div className="flex flex-row items-center gap-2">
            <input
              id="translation-enabled"
              type="checkbox"
              checked={isTranslationEnabled}
              onChange={e => setIsTranslationEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="translation-enabled" className="flex items-center cursor-pointer">
              翻译
            </label>
          </div>
        </div>
      </div>

      <Timer isSessionActive={isConnected} />
    </div>
  );
}

export default BottomToolbar;
