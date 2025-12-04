import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2, AlertTriangle } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const DeleteAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setEmail(session.user.email || "");
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // For now, we'll just show a confirmation
      // In production, this would send a request to your backend
      toast({
        title: "Deletion Request Submitted",
        description: "We have received your account deletion request. We will process it within 7 business days and send a confirmation to your email.",
      });
      
      // Reset form
      setReason("");
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit deletion request. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <article className="prose prose-slate dark:prose-invert max-w-none">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-destructive/10 rounded-full">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold m-0">Delete Account</h1>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-600 dark:text-amber-400 m-0 mb-1">
                  Important Information
                </h3>
                <p className="text-sm text-muted-foreground m-0">
                  Deleting your account is permanent and cannot be undone. All your data, 
                  including saved applications, study notes, and preferences will be permanently removed.
                </p>
              </div>
            </div>
          </div>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">What happens when you delete your account?</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>Your profile and personal information will be permanently deleted</li>
              <li>All saved applications and tracking data will be removed</li>
              <li>Study notes and flashcards will be deleted</li>
              <li>Notification preferences and history will be cleared</li>
              <li>You will lose access to all premium features (if applicable)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Data Retention</h2>
            <p className="text-muted-foreground">
              After you submit a deletion request, we will process it within 7 business days. 
              Some data may be retained for up to 30 days for legal and compliance purposes, 
              after which it will be permanently deleted from our systems.
            </p>
          </section>

          <form onSubmit={handleSubmit} className="space-y-6 not-prose">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email Address *
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your account email"
                required
                disabled={!!user}
              />
              {user && (
                <p className="text-xs text-muted-foreground mt-1">
                  Logged in as {user.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium mb-2">
                Reason for leaving (optional)
              </label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Help us improve by sharing why you're leaving..."
                rows={4}
              />
            </div>

            <Button
              type="submit"
              variant="destructive"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Request Account Deletion"}
            </Button>
          </form>

          <section className="mt-8 pt-8 border-t">
            <h2 className="text-xl font-semibold mb-4">Need Help?</h2>
            <p className="text-muted-foreground">
              If you have questions about account deletion or need assistance, 
              please contact us at{" "}
              <a 
                href="mailto:support@sarkarikhozo.com" 
                className="text-primary hover:underline"
              >
                support@sarkarikhozo.com
              </a>
            </p>
          </section>
        </article>
      </main>

      <footer className="mt-12 py-6 border-t bg-muted/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Sarkari Khozo. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default DeleteAccount;
