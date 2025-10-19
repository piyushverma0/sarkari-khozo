import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  sendMessage: (text: string) => Promise<void>;
}

export const useVoiceMode = (): UseVoiceModeReturn => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [conversationContext, setConversationContext] = useState<ConversationContext>({
    conversationHistory: []
  });
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error === 'network') {
        setError('Network error. Please check your connection.');
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
      stopListening();
      setError('Session timed out due to inactivity.');
      setVoiceState('error');
    }, 2 * 60 * 1000); // 2 minutes
  }, []);

  const handleFinalTranscript = async (text: string) => {
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

    // Process the message
    await sendMessage(text);
    resetInactivityTimeout();
  };

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

  const sendMessage = useCallback(async (text: string) => {
    setVoiceState('processing');
    
    try {
      const { data, error: funcError } = await supabase.functions.invoke('voice-assistant', {
        body: {
          message: text,
          context: conversationContext
        }
      });

      if (funcError) throw funcError;

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
      setError('Failed to process your request. Please try again.');
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
    sendMessage
  };
};
