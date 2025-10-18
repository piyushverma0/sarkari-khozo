import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/80">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Menu className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold">FormVerse</h1>
        </div>

        <Button variant="outline" size="sm" className="rounded-full">
          Sign In
        </Button>
      </div>
    </header>
  );
};

export default Header;
