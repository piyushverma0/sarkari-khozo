import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <article className="prose prose-lg dark:prose-invert max-w-none">
          <header className="mb-8 border-b pb-6">
            <h1 className="text-4xl font-bold mb-4 text-foreground">
              🇮🇳 Sarkari Khozo — Privacy Policy
            </h1>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Effective Date:</strong> 24 October 2025</p>
              <p><strong>Last Updated:</strong> 24 October 2025</p>
            </div>
          </header>

          <section className="mb-8">
            <p className="text-lg text-foreground leading-relaxed">
              Welcome to <strong>Sarkari Khozo</strong> ("we", "our", "us").
              This Privacy Policy explains how we collect, use, and protect your information when you use our website or application (www.sarkarikhozo.in) and related services ("Platform").
            </p>
            <p className="text-lg text-foreground leading-relaxed mt-4">
              Our mission is to help users easily track government exams, schemes, policies, and jobs using AI-powered updates — safely and transparently.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Information We Collect</h2>
            <p className="text-foreground mb-4">We collect limited information necessary to provide and improve our services.</p>
            
            <h3 className="text-xl font-semibold mb-3 text-foreground">(a) Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>When you search for exams, jobs, or schemes.</li>
              <li>When you save or track an application.</li>
              <li>When you subscribe to notifications or reminders.</li>
              <li>When you contact us for support or feedback.</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6 text-foreground">(b) Automatically Collected Information</h3>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>Device and browser information (type, version, OS).</li>
              <li>IP address and approximate location (for region-based results).</li>
              <li>Usage data (pages viewed, clicks, search queries).</li>
              <li>Cookies or local storage for login sessions and preferences.</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6 text-foreground">(c) Optional Information</h3>
            <p className="text-foreground">
              If you choose to create an account or sign in (future feature), we may store your name and email securely.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">2. How We Use Your Information</h2>
            <p className="text-foreground mb-4">We use collected information to:</p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>Provide AI-powered updates and application tracking.</li>
              <li>Improve recommendations and regional relevance.</li>
              <li>Notify you of important updates (exam date, admit card, result, etc.).</li>
              <li>Analyze usage to improve content accuracy and UX.</li>
              <li>Prevent spam, fraud, or misuse.</li>
            </ul>
            <p className="text-foreground mt-4 font-semibold">
              We do not sell, rent, or trade your personal data to anyone.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">3. Data Sources</h2>
            <p className="text-foreground mb-4">Our information is aggregated from:</p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>Official government websites (gov.in, nic.in, pib.gov.in).</li>
              <li>Publicly available notifications, press releases, and exam boards.</li>
              <li>AI summarization of verified public data.</li>
            </ul>
            <p className="text-foreground mt-4">
              We always verify sources where possible, but we do not represent any government authority.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Cookies and Local Storage</h2>
            <p className="text-foreground mb-4">We use cookies/local storage to:</p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>Remember your preferences (language, region, category).</li>
              <li>Keep you signed in (if applicable).</li>
              <li>Track performance analytics anonymously.</li>
            </ul>
            <p className="text-foreground mt-4">
              You can disable cookies anytime in your browser settings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Data Retention</h2>
            <p className="text-foreground mb-4">We keep minimal data only as long as needed for:</p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>Providing the service (application tracking, reminders).</li>
              <li>Fulfilling legal or technical requirements.</li>
              <li>Improving the platform experience.</li>
            </ul>
            <p className="text-foreground mt-4">
              You can request data deletion anytime via <a href="mailto:piyush@gradeai.in" className="text-primary hover:underline">piyush@gradeai.in</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Data Security</h2>
            <p className="text-foreground">
              We use secure, modern encryption (HTTPS/TLS) and best practices for database and cloud storage.
              While we strive to protect your data, no online service can be completely risk-free. Use caution when sharing personal or financial details.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Third-Party Services</h2>
            <p className="text-foreground mb-4">We may use trusted third-party tools like:</p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>AI Models (e.g., Anthropic Claude, OpenAI) for text summarization.</li>
              <li>ElevenLabs for voice/audio summaries.</li>
              <li>Google Analytics or Supabase for performance and storage.</li>
            </ul>
            <p className="text-foreground mt-4">
              These services have their own privacy policies, and we ensure compliance with their data-handling guidelines.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">8. Your Rights</h2>
            <p className="text-foreground mb-4">You can:</p>
            <ul className="list-disc pl-6 space-y-2 text-foreground">
              <li>Request a copy of your stored data.</li>
              <li>Ask for corrections or deletion.</li>
              <li>Withdraw consent for notifications.</li>
            </ul>
            <p className="text-foreground mt-4">
              Contact us for privacy concerns at: ✉️ <a href="mailto:piyush@gradeai.in" className="text-primary hover:underline">piyush@gradeai.in</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">9. Children's Privacy</h2>
            <p className="text-foreground">
              Our platform is not intended for users under 13 years.
              We do not knowingly collect data from minors. If a child's data is found, it will be promptly deleted.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">10. Policy Updates</h2>
            <p className="text-foreground">
              We may update this Privacy Policy occasionally.
              The "Last Updated" date indicates the latest version. We encourage you to review it periodically.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">11. Contact Us</h2>
            <p className="text-foreground mb-2">
              For any questions about this policy or data handling, contact us at:
            </p>
            <p className="text-foreground">
              📩 <a href="mailto:support@sarkarikhozo.in" className="text-primary hover:underline">support@sarkarikhozo.in</a>
            </p>
            <p className="text-foreground mt-2">
              🌐 <a href="https://www.sarkarikhozo.in" className="text-primary hover:underline">www.sarkarikhozo.in</a>
            </p>
          </section>
        </article>
      </main>

      <footer className="py-8 bg-transparent border-t">
        <div className="container mx-auto text-center space-y-2">
          <p className="text-sm text-foreground">
            © 2025 All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with ❤️ by Piyush
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
