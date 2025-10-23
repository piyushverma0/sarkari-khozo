import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Application from "./pages/Application";
import Category from "./pages/Category";
import StartupCategory from "./pages/StartupCategory";
import LawyersCategory from "./pages/LawyersCategory";
import Dashboard from "./pages/Dashboard";
import Discover from "./pages/Discover";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/application" element={<Application />} />
            <Route path="/application/:id" element={<Application />} />
            <Route path="/category/:category/application" element={<Application />} />
            <Route path="/category/:category/application/:id" element={<Application />} />
            <Route path="/category/startups" element={<StartupCategory />} />
            <Route path="/category/lawyers" element={<LawyersCategory />} />
            <Route path="/category/:slug" element={<Category />} />
            <Route path="/discover" element={<Discover />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
