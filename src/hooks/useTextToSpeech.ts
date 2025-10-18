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

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice based on language
    const voice = getVoiceForLanguage(lang);
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'kn' ? 'kn-IN' : 'en-IN';
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      if (sectionId) setCurrentSection(sectionId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentSection(null);
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      setIsPaused(false);
      setCurrentSection(null);
    };

    window.speechSynthesis.speak(utterance);
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
