"use client";

import { ServerEvent, SessionStatus, AgentConfig } from "@/app/types";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useRef, useState } from "react";
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
        // Add debug logs
        console.log("Audio buffer stopped event triggered");
        console.log("Current agent:", selectedAgentName);
        console.log("Agent config set:", selectedAgentConfigSet);

        // Check if we're in Speaking2&3 mode
        const isSpeaking2and3 = selectedAgentName === "口语Part2&3";
        console.log("Is Speaking2&3:", isSpeaking2and3);

        if (isSpeaking2and3 && !isPrepTimerActive) {
          // Find the latest assistant message using transcriptItems
          const latestAssistantMessage = [...transcriptItems]
            .reverse()
            .find(item => item.role === "assistant" && item.type === "MESSAGE");
          
          console.log("Latest assistant message:", latestAssistantMessage?.title);

          if (latestAssistantMessage?.title?.endsWith("Your preparation time starts now.")) {
            console.log("Starting prep timer");
            setIsPrepTimerActive(true);
            
            // Wait for 60 seconds
            setTimeout(() => {
              // Send the sequence of events
              sendClientEvent(
                { type: "input_audio_buffer.clear" },
                "prep_timer_complete"
              );
              sendClientEvent(
                { type: "input_audio_buffer.commit" },
                "prep_timer_complete"
              );
              sendClientEvent(
                { type: "response.create" },
                "prep_timer_complete"
              );
              setIsPrepTimerActive(false);
            }, 60000);
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

  return handleServerEventRef;
}
