import { useCallback } from 'react';
import { ConversationContext, Message } from './useVoiceMode';

export type VoiceCommand = 
  | 'go_back'
  | 'repeat'
  | 'show_details'
  | 'compare'
  | 'pause'
  | 'start_over'
  | 'help'
  | null;

interface VoiceCommandResult {
  command: VoiceCommand;
  params?: any;
}

export const useVoiceCommands = () => {
  const parseCommand = useCallback((text: string): VoiceCommandResult => {
    const lowerText = text.toLowerCase().trim();

    // Go back command
    if (lowerText.includes('go back') || lowerText.includes('previous')) {
      return { command: 'go_back' };
    }

    // Repeat command
    if (lowerText.includes('repeat') || lowerText.includes('say that again') || lowerText === 'what') {
      return { command: 'repeat' };
    }

    // Show details command
    if (lowerText.includes('more details') || lowerText.includes('tell me more') || lowerText.includes('expand')) {
      // Extract program number if mentioned
      const numberMatch = lowerText.match(/(\d+)/);
      const programIndex = numberMatch ? parseInt(numberMatch[1]) - 1 : 0;
      return { command: 'show_details', params: { programIndex } };
    }

    // Compare command
    if (lowerText.includes('compare')) {
      // Extract program numbers (e.g., "compare first and third" or "compare 1 and 3")
      const ordinals = ['first', 'second', 'third', 'fourth', 'fifth'];
      const indices: number[] = [];
      
      ordinals.forEach((ordinal, index) => {
        if (lowerText.includes(ordinal)) {
          indices.push(index);
        }
      });

      // Also check for numeric patterns
      const numbers = lowerText.match(/\d+/g);
      if (numbers) {
        numbers.forEach(num => {
          const idx = parseInt(num) - 1;
          if (idx >= 0 && !indices.includes(idx)) {
            indices.push(idx);
          }
        });
      }

      return { 
        command: 'compare', 
        params: { programIndices: indices.length >= 2 ? indices : [0, 1] } 
      };
    }

    // Pause command
    if (lowerText.includes('pause') || lowerText.includes('stop listening') || lowerText === 'stop') {
      return { command: 'pause' };
    }

    // Start over command
    if (lowerText.includes('start over') || lowerText.includes('reset') || lowerText.includes('new conversation')) {
      return { command: 'start_over' };
    }

    // Help command
    if (lowerText.includes('help') || lowerText === 'what can you do') {
      return { command: 'help' };
    }

    return { command: null };
  }, []);

  const getHelpText = useCallback(() => {
    return `I can help you with:
- Finding programs: "Find startup programs in Karnataka"
- Saving programs: "Save this program"
- Showing saved: "Show my saved programs"
- Navigation: "Go back", "Repeat that"
- Details: "Tell me more about program 1"
- Comparison: "Compare first and third"
- Control: "Pause", "Start over"

What would you like to do?`;
  }, []);

  return {
    parseCommand,
    getHelpText,
  };
};
