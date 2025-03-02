"use client";

import { ServerEvent, SessionStatus, AgentConfig } from "@/app/types";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useRef, useState, useEffect } from "react";
import { fetchTranslation } from '../lib/translation';


export interface UseHandleServerEventParams {
  setSessionStatus: (status: SessionStatus) => void;
  selectedAgentName: string;
  selectedAgentConfigSet: AgentConfig[] | null;
  sendClientEvent: (eventObj: any, eventNameSuffix?: string) => void;
  setSelectedAgentName: (name: string) => void;
  shouldForceResponse?: boolean;
  isTranslationEnabled?: boolean;
  setIsPrepTimerActive: (active: boolean) => void;
  isPrepTimerActive: boolean;
  setIsPTTActive: (active: boolean) => void;
  handleTalkButtonDown: () => void;
  handleTalkButtonUp: () => void;
  sendSimulatedUserMessage: (message: string) => void;
  setIsSpeakingTimerActive: (active: boolean) => void;
  isSpeakingTimerActive: boolean;
}

/// 口语Part2&3 的追踪器
interface ConversationState {
  currentState: string;
  description: string;
  timestamp: number;
}

export function useHandleServerEvent({
  setSessionStatus,
  selectedAgentName,
  selectedAgentConfigSet,
  sendClientEvent,
  setSelectedAgentName,
  isTranslationEnabled = true,
  setIsPrepTimerActive,
  isPrepTimerActive,
  setIsPTTActive,
  handleTalkButtonDown,
  handleTalkButtonUp,
  sendSimulatedUserMessage,
  setIsSpeakingTimerActive,
  isSpeakingTimerActive,
}: UseHandleServerEventParams) {
  const {
    transcriptItems,
    addTranscriptBreadcrumb,
    addTranscriptMessage,
    updateTranscriptMessage,
    updateTranscriptItemStatus,
  } = useTranscript();

  const { logServerEvent } = useEvent();
  /// 口语Part2&3 的追踪器
  const [currentConversationState, setCurrentConversationState] = useState<ConversationState | null>(null);

  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speakingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = () => {
    if (prepTimerRef.current) {
      clearTimeout(prepTimerRef.current);
      prepTimerRef.current = null;
    }
    if (speakingTimerRef.current) {
      clearTimeout(speakingTimerRef.current);
      speakingTimerRef.current = null;
    }
  };

  const handleFunctionCall = async (functionCallParams: {
    name: string;
    call_id?: string;
    arguments: string;
  }) => {
    const args = JSON.parse(functionCallParams.arguments);
    /* 口语Part2&3 的追踪器
    if (functionCallParams.name === "trackConversationState") {
      const { currentState, stateDescription } = args;
      setCurrentConversationState({ currentState, description: stateDescription, timestamp: Date.now() });
      addTranscriptBreadcrumb(
        `State Transition: ${args.currentState}`,
        { description: args.stateDescription }
      );
    }*/
    
    const currentAgent = selectedAgentConfigSet?.find(
      (a) => a.name === selectedAgentName
    );

    addTranscriptBreadcrumb(`function call: ${functionCallParams.name}`, args);

    if (currentAgent?.toolLogic?.[functionCallParams.name]) {
      const fn = currentAgent.toolLogic[functionCallParams.name];
      const fnResult = await fn(args, transcriptItems);
      addTranscriptBreadcrumb(
        `function call result: ${functionCallParams.name}`,
        fnResult
      );

      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallParams.call_id,
          output: JSON.stringify(fnResult),
        },
      });
      sendClientEvent({ type: "response.create" });
    } else if (functionCallParams.name === "transferAgents") {
      const destinationAgent = args.destination_agent;
      const newAgentConfig =
        selectedAgentConfigSet?.find((a) => a.name === destinationAgent) || null;
      if (newAgentConfig) {
        setSelectedAgentName(destinationAgent);
      }
      const functionCallOutput = {
        destination_agent: destinationAgent,
        did_transfer: !!newAgentConfig,
      };
      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallParams.call_id,
          output: JSON.stringify(functionCallOutput),
        },
      });
      addTranscriptBreadcrumb(
        `function call: ${functionCallParams.name} response`,
        functionCallOutput
      );
    } else {
      const simulatedResult = { result: true };
      addTranscriptBreadcrumb(
        `function call fallback: ${functionCallParams.name}`,
        simulatedResult
      );

      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallParams.call_id,
          output: JSON.stringify(simulatedResult),
        },
      });
      sendClientEvent({ type: "response.create" });
    }
  };

  const handleServerEvent = async (serverEvent: ServerEvent) => {
    logServerEvent({...serverEvent, currentConversationState});

    switch (serverEvent.type) {
      case "session.created": {
        if (serverEvent.session?.id) {
          setSessionStatus("CONNECTED");
          
          addTranscriptBreadcrumb(
            `新对话开始 
            \n 起始时间：${new Date().toLocaleString()}`
            // `session.id: ${
            //   serverEvent.session.id
            // }\nStarted at: ${new Date().toLocaleString()}`

          );

          
        }
        break;
      }


      case "conversation.item.created": {
        let text =
          serverEvent.item?.content?.[0]?.text ||
          serverEvent.item?.content?.[0]?.transcript ||
          "";
        const role = serverEvent.item?.role as "user" | "assistant";
        const itemId = serverEvent.item?.id;

        if (itemId && transcriptItems.some((item) => item.itemId === itemId)) {
          break;
        }

        if (itemId && role) {
          if (role === "user" && !text) {
            text = "[Transcribing...]";
          }
          addTranscriptMessage(itemId, role, text);
        }
        break;
      }

      case "conversation.item.input_audio_transcription.completed": {
        const itemId = serverEvent.item_id;
        const finalTranscript =
          !serverEvent.transcript || serverEvent.transcript === "\n"
            ? "[inaudible]"
            : serverEvent.transcript;
        if (itemId) {
          updateTranscriptMessage(itemId, finalTranscript, false);
        }
        break;
      }

      case "response.audio_transcript.delta": {
        const itemId = serverEvent.item_id;
        const deltaText = serverEvent.delta || "";
        if (itemId) {
          updateTranscriptMessage(itemId, deltaText, true);
        }
        break;
      }

      case "response.done": {
        if (serverEvent.response?.output) {
          serverEvent.response.output.forEach((outputItem) => {
            if (
              outputItem.type === "function_call" &&
              outputItem.name &&
              outputItem.arguments
            ) {
              handleFunctionCall({
                name: outputItem.name,
                call_id: outputItem.call_id,
                arguments: outputItem.arguments,
              });
            }
          });
        }
        break;
      }

      case "response.output_item.done": {
        const itemId = serverEvent.item?.id;
        if (itemId) {
          updateTranscriptItemStatus(itemId, "DONE");
          
          /* 口语Part2&3 的追踪器
          if (currentConversationState) {
            addTranscriptBreadcrumb(
              `Completed State: ${currentConversationState.currentState}`,
              {
                description: currentConversationState.description,
                timestamp: new Date(currentConversationState.timestamp).toLocaleString()
              }
            );
          }*/
          if (isTranslationEnabled) {
            const completedMessage = transcriptItems.find(
              item => item.itemId === itemId && item.type === "MESSAGE" && item.role === "assistant"
            );

            if (completedMessage?.title) {
              try {
                const translation = await fetchTranslation(completedMessage.title);
                addTranscriptMessage(
                  `${itemId}-translation`,
                  "assistant",
                  `[Translation] ${translation}`,
                  false
                );
              } catch (error) {
                console.error('Translation failed:', error);
              }
            }
          }
        }
        break;
      }

      case "output_audio_buffer.stopped": {
        const isSpeaking2and3 = selectedAgentName === "口语Part2&3";
        console.log("Is Speaking2&3:", isSpeaking2and3);

        if (isSpeaking2and3) {
          clearTimers();

          const latestAssistantMessage = [...transcriptItems]
            .reverse()
            .find(item => item.role === "assistant" && item.type === "MESSAGE" && !item.title?.startsWith("[Translation]"));
          
          if (latestAssistantMessage?.title?.endsWith("Your preparation time starts now.")) {
            setIsPrepTimerActive(true);
            setIsPTTActive(true);
            
            prepTimerRef.current = setTimeout(() => {
              sendSimulatedUserMessage("I am ready, let's start.");
              setIsPrepTimerActive(false);
              setIsPTTActive(false);
            }, 60000);

          } else if (latestAssistantMessage?.title?.endsWith("Your two minutes start now.") || latestAssistantMessage?.title?.endsWith("Your two minutes starts now.")) {
            console.log("Starting speaking timer");
            setIsPTTActive(true);
            setIsSpeakingTimerActive(true);
            handleTalkButtonDown();
            
            speakingTimerRef.current = setTimeout(() => {
              handleTalkButtonUp();
              setIsPTTActive(false);
              setIsSpeakingTimerActive(false);
            }, 120000);
          }
        }
        break;
      }

      default:
        break;
    }
  };

  const handleServerEventRef = useRef(handleServerEvent);
  handleServerEventRef.current = handleServerEvent;

  // Clean up timers on unmount
  useEffect(() => {
    return () => clearTimers();
  }, []);

  return handleServerEventRef;
}
