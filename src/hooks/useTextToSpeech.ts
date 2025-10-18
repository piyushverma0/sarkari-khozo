import { useState, useCallback, useEffect } from 'react';

type Language = 'en' | 'hi' | 'kn';

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if Web Speech API is supported
    setIsSupported('speechSynthesis' in window);
  }, []);

  const getVoiceForLanguage = useCallback((lang: Language): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    
    let voicePrefix = 'en-IN';
    if (lang === 'hi') voicePrefix = 'hi-IN';
    if (lang === 'kn') voicePrefix = 'kn-IN';

    // Try to find a voice matching the language
    const voice = voices.find(v => v.lang.startsWith(voicePrefix));
    
    // Fallback to any voice containing the language code
    return voice || voices.find(v => v.lang.includes(lang.toUpperCase())) || null;
  }, []);

  const speak = useCallback((text: string, lang: Language = 'en', sectionId?: string) => {
    if (!isSupported) {
      console.warn('Text-to-speech is not supported in this browser');
      return;
    }

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    // For very long text (over 4000 characters), split into chunks
    const MAX_LENGTH = 4000;
    const chunks: string[] = [];
    
    if (text.length > MAX_LENGTH) {
      // Split by sentences to maintain natural flow
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      let currentChunk = '';
      
      sentences.forEach(sentence => {
        if ((currentChunk + sentence).length > MAX_LENGTH) {
          if (currentChunk) chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          currentChunk += sentence;
        }
      });
      
      if (currentChunk) chunks.push(currentChunk.trim());
    } else {
      chunks.push(text);
    }

    let currentChunkIndex = 0;

    const speakChunk = (chunkText: string, isFirst: boolean, isLast: boolean) => {
      const utterance = new SpeechSynthesisUtterance(chunkText);
      
      // Set voice based on language
      const voice = getVoiceForLanguage(lang);
      if (voice) {
        utterance.voice = voice;
      }
      
      utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'kn' ? 'kn-IN' : 'en-IN';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      if (isFirst) {
        utterance.onstart = () => {
          setIsSpeaking(true);
          setIsPaused(false);
          if (sectionId) setCurrentSection(sectionId);
        };
      }

      utterance.onend = () => {
        if (isLast) {
          setIsSpeaking(false);
          setIsPaused(false);
          setCurrentSection(null);
        } else {
          // Speak next chunk
          currentChunkIndex++;
          if (currentChunkIndex < chunks.length) {
            speakChunk(chunks[currentChunkIndex], false, currentChunkIndex === chunks.length - 1);
          }
        }
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentSection(null);
      };

      window.speechSynthesis.speak(utterance);
    };

    // Start speaking the first chunk
    speakChunk(chunks[0], true, chunks.length === 1);
  }, [isSupported, getVoiceForLanguage]);

  const pause = useCallback(() => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentSection(null);
  }, []);

  // Load voices (needed for some browsers)
  useEffect(() => {
    if (isSupported) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, [isSupported]);

  return {
    speak,
    pause,
    resume,
    stop,
    isSpeaking,
    isPaused,
    currentSection,
    isSupported,
  };
};
