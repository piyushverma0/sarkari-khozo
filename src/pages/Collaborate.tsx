import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Download, Users } from "lucide-react";
import logo from "@/assets/logo.png";

const Collaborate = () => {
  const { code } = useParams<{ code: string }>();
  const [showDownload, setShowDownload] = useState(false);

  useEffect(() => {
    if (!code) return;

    // Try to open in app using deep link
    window.location.href = `sarkarikhozo://collaborate/${code}`;

    // After 2 seconds, if still on page, show download option
    const timer = setTimeout(() => {
      setShowDownload(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [code]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <img src={logo} alt="Sarkari Khozo" className="h-16 w-auto mx-auto" />
        
        <div className="space-y-2">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Join Study Note
          </h1>
          <p className="text-muted-foreground">
            You've been invited to collaborate on a study note!
          </p>
        </div>

        {!showDownload ? (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="animate-pulse">
                <FileText className="h-12 w-12 text-primary" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Opening in app...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                Don't have the app? Download SarkariKhozo to collaborate and access exclusive study materials.
              </p>
            </div>
            
            <Button
              size="lg"
              className="w-full"
              onClick={() => window.open("https://play.google.com/store/apps/details?id=com.sarkarikhozo.app", "_blank")}
            >
              <Download className="mr-2 h-5 w-5" />
              Download from Play Store
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => {
                window.location.href = `sarkarikhozo://collaborate/${code}`;
              }}
            >
              I have the app installed
            </Button>
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Invite code: <span className="font-mono text-foreground">{code}</span>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Collaborate;
