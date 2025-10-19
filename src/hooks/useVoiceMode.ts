import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useVoiceCommands } from './useVoiceCommands';

export type VoiceState = 'idle' | 'initializing' | 'listening' | 'processing' | 'speaking' | 'error';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ConversationContext {
  category?: string;
  userType?: string;
  state?: string;
  intent?: string;
  conversationHistory: Message[];
  currentProgram?: any;
  savedPrograms?: any[];
  searchResults?: any[];
}

interface UseVoiceModeReturn {
  voiceState: VoiceState;
  transcript: string;
  conversationContext: ConversationContext;
  error: string | null;
  isSupported: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetSession: () => void;
  sendMessage: (text: string, userId?: string) => Promise<void>;
  handleVoiceCommand: (commandResult: any) => void;
  lastResponse: any;
}

export const useVoiceMode = (): UseVoiceModeReturn => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [conversationContext, setConversationContext] = useState<ConversationContext>({
    conversationHistory: []
  });
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const [lastResponse, setLastResponse] = useState<any>(null);

  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { getHelpText } = useVoiceCommands();

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart + ' ';
        } else {
          interimTranscript += transcriptPart;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      // If we have a final result, process it
      if (finalTranscript) {
        handleFinalTranscript(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      // Provide user-friendly error messages
      if (event.error === 'no-speech') {
        setError("I didn't catch that clearly. Could you please repeat?");
      } else if (event.error === 'network') {
        setError("I'm having trouble connecting. You can click to type instead.");
      } else if (event.error === 'not-allowed') {
        setError("Microphone access denied. Please check your browser settings.");
      } else if (event.error === 'aborted') {
        // User stopped intentionally, don't show error
        return;
      } else {
        setError('Speech recognition error. Please try again.');
      }
      setVoiceState('error');
    };

    recognition.onend = () => {
      if (voiceState === 'listening') {
        // Restart if we're still in listening mode
        recognition.start();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isSupported, voiceState]);

  // Auto-timeout after 2 minutes of inactivity
  const resetInactivityTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setError('Session timed out due to inactivity.');
      setVoiceState('error');
    }, 2 * 60 * 1000); // 2 minutes
  }, []);

  const handleVoiceCommand = useCallback((commandResult: any) => {
    const { command, params } = commandResult;

    switch (command) {
      case 'go_back':
        // Remove last user message and assistant response
        setConversationContext(prev => ({
          ...prev,
          conversationHistory: prev.conversationHistory.slice(0, -2)
        }));
        break;

      case 'repeat':
        // Replay last assistant message
        if (lastResponse) {
          const assistantMessage: Message = {
            role: 'assistant',
            content: lastResponse.text,
            timestamp: Date.now()
          };
          setConversationContext(prev => ({
            ...prev,
            conversationHistory: [...prev.conversationHistory, assistantMessage]
          }));
        }
        break;

      case 'pause':
        // Stop the recognition
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        setVoiceState('idle');
        break;

      case 'start_over':
        // Clear conversation
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        setConversationContext({ conversationHistory: [] });
        setTranscript('');
        setError(null);
        setVoiceState('idle');
        break;

      case 'help':
        const helpMessage: Message = {
          role: 'assistant',
          content: getHelpText(),
          timestamp: Date.now()
        };
        setConversationContext(prev => ({
          ...prev,
          conversationHistory: [...prev.conversationHistory, helpMessage]
        }));
        break;

      default:
        // For show_details and compare, let the assistant handle it
        break;
    }
  }, [lastResponse, getHelpText]);

  const handleFinalTranscript = useCallback(async (text: string) => {
    if (!text) return;

    // Add user message to history
    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    setConversationContext(prev => ({
      ...prev,
      conversationHistory: [...prev.conversationHistory, userMessage]
    }));
    
    resetInactivityTimeout();
    // Note: sendMessage should be called separately from the component with userId
  }, [resetInactivityTimeout]);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError('Speech recognition is not supported in your browser.');
      return;
    }

    try {
      setVoiceState('initializing');
      setError(null);
      setTranscript('');

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      setVoiceState('listening');
      recognitionRef.current?.start();
      resetInactivityTimeout();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setError('Could not access microphone. Please grant permission.');
      setVoiceState('error');
    }
  }, [isSupported, resetInactivityTimeout]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setVoiceState('idle');
    setTranscript('');
  }, []);

  const sendMessage = useCallback(async (text: string, userId?: string) => {
    setVoiceState('processing');
    
    try {
      const { data, error: funcError } = await supabase.functions.invoke('voice-assistant', {
        body: {
          message: text,
          context: conversationContext,
          userId
        }
      });

      if (funcError) {
        // Handle specific API errors
        if (funcError.message?.includes('429')) {
          throw new Error("I'm a bit busy right now. Please try again in a moment.");
        } else if (funcError.message?.includes('402')) {
          throw new Error("Service temporarily unavailable. Please try again later.");
        }
        throw funcError;
      }

      // Store last response for repeat command
      setLastResponse(data);

      // Add assistant response to history
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.text,
        timestamp: Date.now()
      };

      setConversationContext(prev => ({
        ...prev,
        ...data.updatedContext,
        conversationHistory: [...prev.conversationHistory, assistantMessage]
      }));

      setVoiceState('speaking');
      
      // Return to listening after speaking
      setTimeout(() => {
        if (voiceState !== 'idle') {
          setVoiceState('listening');
        }
      }, 1000);

      return data;
    } catch (err) {
      console.error('Error processing message:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process your request. Please try again.';
      setError(errorMessage);
      setVoiceState('error');
    }
  }, [conversationContext, voiceState]);

  const resetSession = useCallback(() => {
    stopListening();
    setConversationContext({ conversationHistory: [] });
    setTranscript('');
    setError(null);
    setVoiceState('idle');
  }, [stopListening]);

  return {
    voiceState,
    transcript,
    conversationContext,
    error,
    isSupported,
    startListening,
    stopListening,
    resetSession,
    sendMessage,
    handleVoiceCommand,
    lastResponse,
  };
};
