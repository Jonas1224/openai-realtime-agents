"use client";

import React from 'react';
import { useTranscript } from '../contexts/TranscriptContext';
import ReactMarkdown from "react-markdown";

export default function CurrentConversation() {
  const { transcriptItems, currentQuestionId } = useTranscript();

  // Get current Q&A pair
  const currentMessages = transcriptItems.filter(item => {
    if (!currentQuestionId) return false;

    // Find current question's index
    const currentQuestionIndex = transcriptItems.findIndex(
      msg => msg.itemId === currentQuestionId
    );

    // Find this message's index
    const thisMessageIndex = transcriptItems.findIndex(
      msg => msg.itemId === item.itemId
    );

    // Show messages that are:
    // 1. The current question
    // 2. Messages after the current question until the next question
    // 3. Translations of the current question
    return (
      item.itemId === currentQuestionId ||
      (thisMessageIndex > currentQuestionIndex && 
       !transcriptItems
         .slice(currentQuestionIndex + 1, thisMessageIndex)
         .some(m => m.role === "assistant" && !m.title?.startsWith("[Translation]")))
    );
  });

  if (currentMessages.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4 overflow-auto" style={{ maxHeight: '40vh' }}>
      <h2 className="text-lg font-semibold mb-3 text-gray-700">Current Conversation</h2>
      <div className="space-y-4">
        {currentMessages.map((item) => {
          const { itemId, role, timestamp, title = "" } = item;
          const isUser = role === "user";
          const isTranslation = title.startsWith("[Translation]");
          
          return (
            <div
              key={itemId}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-lg p-3 rounded-xl ${
                  isUser 
                    ? "bg-gray-900 text-gray-100" 
                    : "bg-gray-100 text-black"
                }`}
              >
                <div className={`text-xs ${isUser ? "text-gray-400" : "text-gray-500"} font-mono`}>
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