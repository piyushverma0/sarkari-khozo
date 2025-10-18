import { useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  question: string;
  options: string[];
}

interface StartupEligibilityQuizProps {
  programTitle: string;
  eligibility: string;
  sector?: string;
  stage?: string;
  fundingAmount?: string;
  dpiitRequired?: boolean;
  onClose: () => void;
}

const StartupEligibilityQuiz = ({
  programTitle,
  eligibility,
  sector,
  stage,
  fundingAmount,
  dpiitRequired,
  onClose,
}: StartupEligibilityQuizProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<{
    eligible: boolean;
    matchedCriteria: string[];
    unmatchedCriteria: string[];
    suggestions: string[];
  } | null>(null);
  const { toast } = useToast();

  // Generate quiz questions on mount
  useState(() => {
    generateQuiz();
  });

  const generateQuiz = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-eligibility-quiz', {
        body: {
          programTitle,
          eligibility,
          sector,
          stage,
          fundingAmount,
          dpiitRequired,
        },
      });

      if (error) throw error;

      if (data?.questions) {
        setQuestions(data.questions);
      }
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate eligibility quiz.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    setAnswers({
      ...answers,
      [questions[currentQuestionIndex].id]: answer,
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-eligibility-quiz', {
        body: {
          programTitle,
          eligibility,
          sector,
          stage,
          fundingAmount,
          dpiitRequired,
          answers,
          analyze: true,
        },
      });

      if (error) throw error;

      if (data?.result) {
        setResult(data.result);
      }
    } catch (error: any) {
      console.error('Error analyzing eligibility:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to analyze eligibility.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && questions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          {result.eligible ? (
            <div className="space-y-2">
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
              <h3 className="text-2xl font-bold text-green-600">You're Eligible!</h3>
              <p className="text-muted-foreground">
                Great news! You meet the eligibility criteria for {programTitle}.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <XCircle className="w-16 h-16 mx-auto text-destructive" />
              <h3 className="text-2xl font-bold text-destructive">Not Eligible Yet</h3>
              <p className="text-muted-foreground">
                You don't currently meet all eligibility criteria for {programTitle}.
              </p>
            </div>
          )}
        </div>

        {result.matchedCriteria.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <h4 className="font-semibold">Criteria You Meet</h4>
              </div>
              <ul className="space-y-2">
                {result.matchedCriteria.map((criteria, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                      ✓
                    </Badge>
                    <span>{criteria}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {result.unmatchedCriteria.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h4 className="font-semibold">Missing Requirements</h4>
              </div>
              <ul className="space-y-2">
                {result.unmatchedCriteria.map((criteria, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                      ✗
                    </Badge>
                    <span>{criteria}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {result.suggestions.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                <h4 className="font-semibold">Next Steps & Suggestions</h4>
              </div>
              <ul className="space-y-2">
                {result.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {result.eligible && (
            <Button onClick={onClose}>
              Continue Application
            </Button>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion?.id];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Question {currentQuestionIndex + 1} of {questions.length}
        </div>
        <div className="flex gap-1">
          {questions.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index <= currentQuestionIndex ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">{currentQuestion.question}</h3>
        <RadioGroup value={currentAnswer} onValueChange={handleAnswerSelect}>
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-3">
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label
                  htmlFor={`option-${index}`}
                  className="flex-1 cursor-pointer py-3 px-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      </div>

      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {currentQuestionIndex === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!currentAnswer || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!currentAnswer}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StartupEligibilityQuiz;
