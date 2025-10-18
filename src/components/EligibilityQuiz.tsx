import { useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Question {
  question: string;
  requirement: string;
}

interface EligibilityQuizProps {
  eligibility: string;
  onClose: () => void;
}

const EligibilityQuiz = ({ eligibility, onClose }: EligibilityQuizProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
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

        if (!data || !data.questions || data.questions.length === 0) {
          throw new Error("No questions generated");
        }

        setQuestions(data.questions);
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

  const handleAnswer = (answer: boolean) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setShowResult(true);
    }
  };

  const calculateEligibility = () => {
    const yesCount = answers.filter(a => a).length;
    const percentage = (yesCount / questions.length) * 100;
    return {
      isEligible: percentage >= 80,
      percentage: Math.round(percentage),
      yesCount,
      totalQuestions: questions.length
    };
  };

  if (isLoading) {
    return (
      <Card className="w-full animate-fade-in">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Generating eligibility questions...</p>
        </CardContent>
      </Card>
    );
  }

  if (showResult) {
    const result = calculateEligibility();
    return (
      <Card className="w-full animate-scale-in">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4">
            {result.isEligible ? (
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            ) : (
              <XCircle className="w-16 h-16 text-destructive" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {result.isEligible ? "You're Likely Eligible!" : "You May Not Be Eligible"}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            You met {result.yesCount} out of {result.totalQuestions} criteria ({result.percentage}%)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">
              {result.isEligible 
                ? "Based on your responses, you appear to meet the eligibility requirements. We recommend proceeding with the application."
                : "Based on your responses, you may not meet all the eligibility requirements. Please review the full criteria or contact the relevant authority for clarification."
              }
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Your Responses:</h4>
            {questions.map((q, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                {answers[index] ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                )}
                <span className="text-muted-foreground">{q.question}</span>
              </div>
            ))}
          </div>

          <Button onClick={onClose} className="w-full">
            Close Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / questions.length) * 100;

  return (
    <Card className="w-full animate-fade-in">
      <CardHeader>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <CardTitle className="text-xl mt-4">{currentQuestion.question}</CardTitle>
        {currentQuestion.requirement && (
          <CardDescription className="text-sm">
            Requirement: {currentQuestion.requirement}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={() => handleAnswer(true)}
          className="w-full h-14 text-lg"
          variant="default"
        >
          <CheckCircle2 className="w-5 h-5 mr-2" />
          Yes
        </Button>
        <Button
          onClick={() => handleAnswer(false)}
          className="w-full h-14 text-lg"
          variant="outline"
        >
          <XCircle className="w-5 h-5 mr-2" />
          No
        </Button>
        <Button
          onClick={onClose}
          className="w-full"
          variant="ghost"
          size="sm"
        >
          Cancel Quiz
        </Button>
      </CardContent>
    </Card>
  );
};

export default EligibilityQuiz;
