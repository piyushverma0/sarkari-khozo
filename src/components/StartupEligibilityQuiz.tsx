import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  useEffect(() => {
    generateQuiz();
  }, []);

  const generateQuiz = async () => {
    setIsLoading(true);
    try {
      console.log('Calling generate-eligibility-quiz with:', {
        programTitle,
        eligibility: eligibility?.substring(0, 100),
        sector,
        stage,
        fundingAmount,
        dpiitRequired
      });

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

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.questions) {
        console.log('Received', data.questions.length, 'questions');
        setQuestions(data.questions);
      } else {
        console.error('No questions in response:', data);
        throw new Error('No questions received from server');
      }
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      const errorMessage = error.message?.includes('Rate limit') 
        ? 'Too many requests. Please try again in a moment.'
        : error.message?.includes('credits')
        ? 'AI service temporarily unavailable. Please try again.'
        : 'Failed to generate eligibility quiz. Please try again.';
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
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
      <Card className="w-full animate-fade-in glass-card border-primary/20">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground text-lg">Generating eligibility questions...</p>
        </CardContent>
      </Card>
    );
  }

  // Handle case where questions failed to load
  if (!isLoading && questions.length === 0) {
    return (
      <Card className="w-full glass-card border-primary/20">
        <CardContent className="space-y-6 py-12">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
            <h3 className="text-2xl font-semibold mb-3">Unable to Load Quiz</h3>
            <p className="text-muted-foreground text-base">
              We couldn't generate the eligibility quiz at this time.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={onClose} className="h-11 px-6">
              Close
            </Button>
            <Button onClick={generateQuiz} className="h-11 px-6">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (result) {
    return (
      <Card className="w-full animate-scale-in glass-card border-primary/20">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-6">
            {result.eligible ? (
              <CheckCircle2 className="w-20 h-20 text-green-500" />
            ) : (
              <XCircle className="w-20 h-20 text-destructive" />
            )}
          </div>
          <CardTitle className="text-3xl mb-3">
            {result.eligible ? "You're Eligible!" : "Not Eligible Yet"}
          </CardTitle>
          <CardDescription className="text-base">
            {result.eligible 
              ? `Great news! You meet the eligibility criteria for ${programTitle}.`
              : `You don't currently meet all eligibility criteria for ${programTitle}.`
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {result.matchedCriteria.length > 0 && (
            <div className="p-5 bg-slate-800/40 backdrop-blur-sm rounded-xl border border-green-500/20">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <h4 className="font-semibold text-base">Criteria You Meet</h4>
              </div>
              <ul className="space-y-2.5">
                {result.matchedCriteria.map((criteria, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm">
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30 mt-0.5">
                      ✓
                    </Badge>
                    <span className="text-foreground/90 flex-1">{criteria}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.unmatchedCriteria.length > 0 && (
            <div className="p-5 bg-slate-800/40 backdrop-blur-sm rounded-xl border border-amber-500/20">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <h4 className="font-semibold text-base">Missing Requirements</h4>
              </div>
              <ul className="space-y-2.5">
                {result.unmatchedCriteria.map((criteria, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm">
                    <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30 mt-0.5">
                      ✗
                    </Badge>
                    <span className="text-foreground/90 flex-1">{criteria}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.suggestions.length > 0 && (
            <div className="p-5 bg-slate-800/40 backdrop-blur-sm rounded-xl border border-blue-500/20">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-blue-500" />
                <h4 className="font-semibold text-base">Next Steps & Suggestions</h4>
              </div>
              <ul className="space-y-2.5">
                {result.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm">
                    <span className="text-blue-400 font-bold">•</span>
                    <span className="text-foreground/90 flex-1">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="h-11 px-6">
              Close
            </Button>
            {result.eligible && (
              <Button onClick={onClose} className="h-11 px-6">
                Continue Application
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
    return (
      <Card className="w-full glass-card border-primary/20">
        <CardContent className="space-y-6 py-12">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
            <h3 className="text-2xl font-semibold mb-3">Quiz Not Available</h3>
            <p className="text-muted-foreground text-base">
              There was a problem loading the quiz questions.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={onClose} className="h-11 px-6">
              Close
            </Button>
            <Button onClick={generateQuiz} className="h-11 px-6">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const currentAnswer = answers[currentQuestion.id];

  return (
    <Card className="w-full animate-fade-in glass-card border-primary/20">
      <CardHeader className="pb-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
            <div className="flex gap-1.5">
              {questions.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index <= currentQuestionIndex ? 'bg-primary' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
          <Progress 
            value={((currentQuestionIndex + 1) / questions.length) * 100} 
            className="h-2.5 bg-slate-800/50 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-primary-glow" 
          />
        </div>
        <CardTitle className="text-2xl mt-6">{currentQuestion.question}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <RadioGroup value={currentAnswer} onValueChange={handleAnswerSelect}>
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <div 
                key={index} 
                className={`flex items-center space-x-3 p-4 rounded-xl border transition-all cursor-pointer ${
                  currentAnswer === option
                    ? 'bg-primary/20 border-primary/40'
                    : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-600'
                }`}
                onClick={() => handleAnswerSelect(option)}
              >
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label
                  htmlFor={`option-${index}`}
                  className="flex-1 cursor-pointer text-base"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>

        <div className="flex justify-between gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="h-11 px-6"
          >
            Previous
          </Button>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="h-11 px-6">
              Cancel
            </Button>
            {currentQuestionIndex === questions.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={!currentAnswer || isLoading}
                className="h-11 px-6"
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
              <Button onClick={handleNext} disabled={!currentAnswer} className="h-11 px-6">
                Next
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StartupEligibilityQuiz;
