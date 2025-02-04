"use client";

import React, { useRef, useEffect, useState } from "react";

export interface VideoProps {
  isExpanded: boolean;
}

function Video({ isExpanded }: VideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const reviewVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string>('');
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isExpanded) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isExpanded]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: true  // Add audio permission request
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startRecording = () => {
    if (!videoRef.current?.srcObject) return;

    const stream = videoRef.current.srcObject as MediaStream;
    
    // Use VP8 codec which has better compatibility
    const options = {
      mimeType: 'video/webm;codecs=vp8,opus',
      videoBitsPerSecond: 2500000,
    };
    
    console.log('Using recorder options:', options);
    
    const mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorderRef.current = mediaRecorder;
    
    const chunks: Blob[] = [];
    let startTime = Date.now();
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
        setRecordedChunks(prevChunks => [...prevChunks, e.data]);
        console.log(`Chunk collected, size: ${e.data.size} bytes, time: ${Date.now() - startTime}ms`);
      }
    };

    // Use 1-second intervals for better compatibility
    mediaRecorder.start(1000);
    console.log('Recording started with 1s intervals');
    setIsRecording(true);
    setIsPaused(false);
    setRecordedChunks([]);
    setRecordingTime(0);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      // Ensure we get the final chunk
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          setRecordedChunks(prevChunks => [...prevChunks, e.data]);
        }
      };
    }
    setRecordingTime(0);

    // Create video URL for review
    if (recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
    }
  };

  const downloadRecording = () => {
    if (recordedChunks.length === 0) return;
    
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `recording_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  const handleReview = () => {
    if (recordedChunks.length === 0) return;

    // Create blob and URL if not already created
    if (!recordedVideoUrl) {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
    }

    // Open review page in new tab instead of new window
    window.open(
      `/review?videoUrl=${encodeURIComponent(recordedVideoUrl)}`,
      '_blank'  // This will open in a new tab
    );
  };

  return (
    <div
      className={
        (isExpanded ? "w-1/2 overflow-auto" : "w-0 overflow-hidden opacity-0") +
        " transition-all rounded-xl duration-200 ease-in-out flex flex-col bg-white"
      }
    >
      {isExpanded && (
        <div className="video-container">
          <div className="font-semibold px-6 py-4 sticky top-0 z-10 text-base border-b bg-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span>Video Recording</span>
              {isRecording && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
                    <span className="text-sm font-normal text-gray-600">
                      {isPaused ? 'PAUSED' : 'REC'} {formatTime(recordingTime)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="px-4 py-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200"
                >
                  Start Recording
                </button>
              ) : (
                <>
                  <button
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    className="px-4 py-1 rounded-full bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                  >
                    {isPaused ? "Resume" : "Pause"}
                  </button>
                  <button
                    onClick={stopRecording}
                    className="px-4 py-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    Stop
                  </button>
                </>
              )}
              {recordedChunks.length > 0 && !isRecording && (
                <>
                  <button
                    onClick={handleReview}
                    className="px-4 py-1 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200"
                  >
                    Review
                  </button>
                  <button
                    onClick={downloadRecording}
                    className="px-4 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200"
                  >
                    Download
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="p-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-lg bg-gray-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Video; 