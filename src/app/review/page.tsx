"use client";

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function ReviewPage() {
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = searchParams.get('videoUrl');

  useEffect(() => {
    // Clean up the URL when component unmounts
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  if (!videoUrl) {
    return <div className="p-8">No video URL provided</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Video Review</h1>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          Close
        </button>
      </div>
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        autoPlay
        className="w-full rounded-lg bg-gray-100 shadow-lg"
      />
    </div>
  );
} 