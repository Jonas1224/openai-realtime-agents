"use client";

import React from 'react';
import { useTranscript } from '../contexts/TranscriptContext';
import ReactMarkdown from "react-markdown";

export default function CurrentConversation() {
  const { transcriptItems, currentQuestionId } = useTranscript();

  // Get only the current question
  const currentMessage = transcriptItems.find(item => 
    item.itemId === currentQuestionId && 
    item.role === "assistant" && 
    !item.title?.startsWith("[Translation]")
  );

  // Get translation if it exists (the message right after current question)
  const translation = currentQuestionId ? transcriptItems.find(item => 
    item.role === "assistant" && 
    item.title?.startsWith("[Translation]") &&
    transcriptItems.findIndex(msg => msg.itemId === item.itemId) > 
    transcriptItems.findIndex(msg => msg.itemId === currentQuestionId)
  ) : null;

  const messagesToShow = [currentMessage, translation].filter(Boolean);

  if (!currentMessage) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4 overflow-auto" style={{ maxHeight: '60vh' }}>
      <h2 className="text-lg font-semibold mb-3 text-gray-700">Current Question</h2>
      <div className="space-y-4">
        {messagesToShow.map((item) => {
          const { itemId, role, timestamp, title = "" } = item!;
          const isTranslation = title.startsWith("[Translation]");
          
          return (
            <div
              key={itemId}
              className="flex justify-start"
            >
              <div
                className="max-w-lg p-3 rounded-xl bg-gray-100 text-black"
              >
                <div className="text-xs text-gray-500 font-mono">
                  {timestamp}
                </div>
                <div className={isTranslation ? "text-gray-600 text-sm" : ""}>
                  <ReactMarkdown>
                    {isTranslation ? title.replace("[Translation] ", "") : title}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}