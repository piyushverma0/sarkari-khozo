import { useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: string;
  question: string;
  requirement?: string;
  type: 'yes-no' | 'multiple-choice' | 'text';
  options?: string[];
}

interface EligibilityQuizProps {
  eligibility: string;
  onClose: () => void;
}

const EligibilityQuiz = ({ eligibility, onClose }: EligibilityQuizProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAnswer, setCurrentAnswer] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const { toast } = useToast();

  useState(() => {
    const fetchQuiz = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-eligibility-quiz', {
          body: { eligibility }
        });

        if (error) throw error;

        if (!data || !data.quiz || data.quiz.length === 0) {
          throw new Error("No questions generated");
        }

        setQuestions(data.quiz);
      } catch (error: any) {
        console.error("Error generating quiz:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to generate eligibility quiz.",
        });
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuiz();
  });

  const handleAnswer = (answer: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    const newAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(newAnswers);
    setCurrentAnswer("");

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setShowResult(true);
    }
  };

  const calculateEligibility = () => {
    // Count positive answers (Yes for yes-no questions)
    let positiveCount = 0;
    questions.forEach(q => {
      const answer = answers[q.id];
      if (q.type === 'yes-no' && answer === 'Yes') {
        positiveCount++;
      } else if (q.type === 'multiple-choice' || q.type === 'text') {
        // For other types, count as positive if answered
        if (answer && answer.trim().length > 0) {
          positiveCount++;
        }
      }
    });
    
    const percentage = (positiveCount / questions.length) * 100;
    return {
      isEligible: percentage >= 70,
      percentage: Math.round(percentage),
      yesCount: positiveCount,
      totalQuestions: questions.length
    };
  };

  if (isLoading) {
    return (
      <Card className="w-full animate-fade-in glass-card border-primary/20">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground text-lg">Generating eligibility questions...</p>
        </CardContent>
      </Card>
    );
  }

  if (showResult) {
    const result = calculateEligibility();
    return (
      <Card className="w-full animate-scale-in glass-card border-primary/20">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-6">
            {result.isEligible ? (
              <CheckCircle2 className="w-20 h-20 text-green-500" />
            ) : (
              <XCircle className="w-20 h-20 text-destructive" />
            )}
          </div>
          <CardTitle className="text-3xl mb-3">
            {result.isEligible ? "You're Likely Eligible!" : "You May Not Be Eligible"}
          </CardTitle>
          <CardDescription className="text-base">
            You met {result.yesCount} out of {result.totalQuestions} criteria ({result.percentage}%)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-5 bg-slate-800/40 backdrop-blur-sm rounded-xl border border-primary/10">
            <p className="text-sm text-foreground/80 leading-relaxed">
              {result.isEligible 
                ? "Based on your responses, you appear to meet the eligibility requirements. We recommend proceeding with the application."
                : "Based on your responses, you may not meet all the eligibility requirements. Please review the full criteria or contact the relevant authority for clarification."
              }
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-base">Your Responses:</h4>
            {questions.map((q) => {
              const answer = answers[q.id];
              const isPositive = q.type === 'yes-no' ? answer === 'Yes' : (answer && answer.trim().length > 0);
              
              return (
                <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/20 border border-slate-700/50">
                  {isPositive ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-foreground/90 font-medium">{q.question}</p>
                    <p className="text-sm text-muted-foreground mt-1">Your answer: <span className="font-semibold">{answer || 'Not answered'}</span></p>
                  </div>
                </div>
              );
            })}
          </div>

          <Button onClick={onClose} className="w-full h-12 text-base">
            Close Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return null;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / questions.length) * 100;

  return (
    <Card className="w-full animate-fade-in glass-card border-primary/20">
      <CardHeader className="pb-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2.5 bg-slate-800/50 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-primary-glow" />
        </div>
        <CardTitle className="text-2xl mt-6 mb-2">{currentQuestion.question}</CardTitle>
        {currentQuestion.requirement && (
          <CardDescription className="text-base text-muted-foreground">
            Requirement: {currentQuestion.requirement}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {currentQuestion.type === 'yes-no' && (
          <>
            <Button
              onClick={() => handleAnswer('Yes')}
              className="w-full h-16 text-lg font-semibold bg-primary/20 hover:bg-primary/30 border border-primary/40 hover:border-primary/60 transition-all"
              variant="outline"
            >
              <CheckCircle2 className="w-6 h-6 mr-3" />
              Yes
            </Button>
            <Button
              onClick={() => handleAnswer('No')}
              className="w-full h-16 text-lg font-semibold bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 transition-all"
              variant="outline"
            >
              <XCircle className="w-6 h-6 mr-3" />
              No
            </Button>
          </>
        )}

        {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
          <>
            <RadioGroup value={currentAnswer} onValueChange={setCurrentAnswer} className="space-y-3">
              {currentQuestion.options.map((option, idx) => (
                <div key={idx} className="flex items-center space-x-3 p-4 rounded-lg border border-slate-700/50 hover:border-primary/40 transition-colors cursor-pointer bg-slate-800/20">
                  <RadioGroupItem value={option} id={`option-${idx}`} />
                  <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer text-base">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <Button
              onClick={() => handleAnswer(currentAnswer)}
              disabled={!currentAnswer}
              className="w-full h-12 text-base"
            >
              Next Question
            </Button>
          </>
        )}

        {currentQuestion.type === 'text' && (
          <>
            <Textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="min-h-[120px] text-base"
            />
            <Button
              onClick={() => handleAnswer(currentAnswer)}
              disabled={!currentAnswer.trim()}
              className="w-full h-12 text-base"
            >
              Next Question
            </Button>
          </>
        )}

        <Button
          onClick={onClose}
          className="w-full mt-2 text-muted-foreground hover:text-foreground"
          variant="ghost"
        >
          Cancel Quiz
        </Button>
      </CardContent>
    </Card>
  );
};

export default EligibilityQuiz;
