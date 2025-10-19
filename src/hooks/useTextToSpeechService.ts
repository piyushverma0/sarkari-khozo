import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AudioQueueItem {
  text: string;
  audioData?: string;
  language: 'en' | 'hi';
}

interface UseTextToSpeechServiceReturn {
  isSpeaking: boolean;
  isLoading: boolean;
  currentText: string;
  speak: (text: string, language?: 'en' | 'hi') => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

export const useTextToSpeechService = (): UseTextToSpeechServiceReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentText, setCurrentText] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<AudioQueueItem[]>([]);
  const isProcessingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || queueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    const item = queueRef.current[0];

    try {
      setCurrentText(item.text);
      setIsLoading(true);

      // Get audio from edge function
      const { data, error } = await supabase.functions.invoke('generate-voice-response', {
        body: {
          text: item.text,
          language: item.language
        }
      });

      if (error) throw error;

      setIsLoading(false);
      setIsSpeaking(true);

      // Create audio element and play
      const audioBlob = base64ToBlob(data.audioContent, 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        
        // Remove completed item and process next
        queueRef.current.shift();
        isProcessingRef.current = false;
        
        if (queueRef.current.length > 0) {
          processQueue();
        } else {
          setCurrentText('');
        }
      };

      audio.onerror = () => {
        console.error('Audio playback error');
        setIsSpeaking(false);
        setIsLoading(false);
        URL.revokeObjectURL(audioUrl);
        
        queueRef.current.shift();
        isProcessingRef.current = false;
        
        if (queueRef.current.length > 0) {
          processQueue();
        }
      };

      await audio.play();
    } catch (err) {
      console.error('TTS error:', err);
      setIsLoading(false);
      setIsSpeaking(false);
      
      // Remove failed item and continue
      queueRef.current.shift();
      isProcessingRef.current = false;
      
      if (queueRef.current.length > 0) {
        processQueue();
      }
    }
  }, []);

  const speak = useCallback(async (text: string, language: 'en' | 'hi' = 'en') => {
    if (!text) return;

    // Add to queue
    queueRef.current.push({ text, language });
    
    // Start processing if not already processing
    if (!isProcessingRef.current) {
      await processQueue();
    }
  }, [processQueue]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
    }
    
    queueRef.current = [];
    isProcessingRef.current = false;
    setIsSpeaking(false);
    setIsLoading(false);
    setCurrentText('');
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current && isSpeaking) {
      audioRef.current.pause();
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  const resume = useCallback(() => {
    if (audioRef.current && !isSpeaking) {
      audioRef.current.play();
      setIsSpeaking(true);
    }
  }, [isSpeaking]);

  return {
    isSpeaking,
    isLoading,
    currentText,
    speak,
    stop,
    pause,
    resume
  };
};

// Helper function to convert base64 to Blob
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: mimeType });
}
