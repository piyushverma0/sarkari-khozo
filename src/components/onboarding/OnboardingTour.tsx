import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, Step, STATUS } from 'react-joyride';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Guided Tour System using react-joyride
 * 
 * Provides interactive tutorials for key features
 */

export type TourType = 'search' | 'eligibility' | 'application' | 'location' | 'discover';

interface OnboardingTourProps {
  tourType: TourType;
  run: boolean;
  onComplete: () => void;
}

const tourSteps: Record<TourType, Step[]> = {
  search: [
    {
      target: '[data-tour="search-input"]',
      content: 'Start by searching for government schemes, exams, or jobs. Try typing what you\'re looking for!',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '[data-tour="search-filters"]',
      content: 'Use filters to narrow down results by category, location, or deadline.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="search-autocomplete"]',
      content: 'Get instant suggestions as you type to find exactly what you need.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="search-results"]',
      content: 'Browse search results and click on any item to see full details.',
      placement: 'top',
    },
  ],

  eligibility: [
    {
      target: '[data-tour="eligibility-quiz"]',
      content: 'Take our quick eligibility quiz to find schemes perfect for you!',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '[data-tour="quiz-question"]',
      content: 'Answer questions about your age, location, education, and occupation.',
      placement: 'right',
    },
    {
      target: '[data-tour="quiz-progress"]',
      content: 'Track your progress through the quiz - it only takes 2 minutes!',
      placement: 'top',
    },
    {
      target: '[data-tour="quiz-results"]',
      content: 'Get personalized recommendations based on your eligibility.',
      placement: 'center',
    },
  ],

  application: [
    {
      target: '[data-tour="application-card"]',
      content: 'This is your application card. Track all important dates and status here.',
      disableBeacon: true,
      placement: 'top',
    },
    {
      target: '[data-tour="deadline-countdown"]',
      content: 'Live countdown shows exactly how much time you have left to apply.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="save-application"]',
      content: 'Save applications to your dashboard for quick access later.',
      placement: 'left',
    },
    {
      target: '[data-tour="share-application"]',
      content: 'Share opportunities with friends via WhatsApp, Telegram, or other apps.',
      placement: 'left',
    },
    {
      target: '[data-tour="application-details"]',
      content: 'Click "View Details" to see complete eligibility, documents, and how to apply.',
      placement: 'top',
    },
  ],

  location: [
    {
      target: '[data-tour="location-check"]',
      content: 'Check if a scheme is available in your local area.',
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '[data-tour="state-select"]',
      content: 'Select your state from the dropdown.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="district-select"]',
      content: 'Then choose your district for more accurate results.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="block-select"]',
      content: 'Finally, select your block or tehsil if needed.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="csc-locator"]',
      content: 'Find nearby Common Service Centers to help with applications.',
      placement: 'top',
    },
  ],

  discover: [
    {
      target: '[data-tour="personalized-feed"]',
      content: 'Your personalized feed shows schemes recommended just for you!',
      disableBeacon: true,
      placement: 'top',
    },
    {
      target: '[data-tour="recommendation-reason"]',
      content: 'See why each item was recommended based on your profile and interests.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="trending-section"]',
      content: 'Check what\'s trending this week to discover popular opportunities.',
      placement: 'left',
    },
    {
      target: '[data-tour="recently-viewed"]',
      content: 'Quickly access items you\'ve viewed recently.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="related-items"]',
      content: 'Find similar schemes and exams you might be interested in.',
      placement: 'top',
    },
  ],
};

export const OnboardingTour = ({ tourType, run, onComplete }: OnboardingTourProps) => {
  const { t } = useTranslation();
  const [steps] = useState<Step[]>(tourSteps[tourType] || []);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onComplete();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      disableOverlayClose
      disableCloseOnEsc
      spotlightPadding={4}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 8,
          fontSize: 14,
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          borderRadius: 6,
          padding: '8px 16px',
        },
        buttonBack: {
          color: 'hsl(var(--foreground))',
          marginRight: 8,
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
        },
      }}
      locale={{
        back: t?.('common.back') || 'Back',
        close: t?.('common.close') || 'Close',
        last: 'Finish',
        next: t?.('common.next') || 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
};

// Hook to manage onboarding state
export const useOnboarding = (tourType: TourType) => {
  const [hasCompletedTour, setHasCompletedTour] = useState(false);
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(`onboarding-${tourType}-completed`);
    setHasCompletedTour(completed === 'true');

    // Auto-start tour if not completed
    if (!completed) {
      setTimeout(() => setRunTour(true), 1000);
    }
  }, [tourType]);

  const completeTour = () => {
    localStorage.setItem(`onboarding-${tourType}-completed`, 'true');
    setHasCompletedTour(true);
    setRunTour(false);
  };

  const resetTour = () => {
    localStorage.removeItem(`onboarding-${tourType}-completed`);
    setHasCompletedTour(false);
  };

  const startTour = () => {
    setRunTour(true);
  };

  return {
    runTour,
    hasCompletedTour,
    startTour,
    completeTour,
    resetTour,
  };
};

export default OnboardingTour;
