import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <h1 className="text-3xl font-extrabold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: April 29, 2026 (multi-language support, owner document signing, and reliability improvements)</p>

        <div className="prose prose-sm prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-bold text-foreground">1. Data We Collect</h2>
            <p>When you use Fluxcore, we collect:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Roblox Account Data:</strong> Your Roblox user ID and username (obtained via Roblox OAuth or bio verification).</li>
              <li><strong>Activity Data:</strong> In-game session logs including join/leave times, duration, and message counts — only for staff members in workspaces that have activity tracking enabled.</li>
              <li><strong>Workspace Data:</strong> Roles, permissions, announcements, LOA requests, and member logs you create within your workspace.</li>
            </ul>
            <p>We do <strong>not</strong> collect email addresses, real names, IP addresses for tracking, or any data from players who are not staff members.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">2. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To authenticate your identity and link your Roblox account.</li>
              <li>To display activity metrics and leaderboards within your workspace.</li>
              <li>To manage staff roles, permissions, and workspace operations.</li>
              <li>To provide session scheduling and shift management features.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">3. Data Sharing</h2>
            <p>We do <strong>not</strong> sell, rent, or share your personal data with third parties. Your workspace data is only visible to members of that workspace according to their permissions.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">4. Data Retention</h2>
            <p>Your data is retained as long as your account is active. If you leave a workspace, your membership data is deleted. Activity logs are retained for workspace analytics but can be deleted by workspace owners.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">5. Your Rights (GDPR)</h2>
            <p>If you are in the EU/EEA, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Access:</strong> Request a copy of your personal data.</li>
              <li><strong>Rectification:</strong> Request correction of inaccurate data.</li>
              <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten").</li>
              <li><strong>Portability:</strong> Request your data in a machine-readable format.</li>
              <li><strong>Object:</strong> Object to processing of your data.</li>
            </ul>
            <p>To exercise these rights, contact us via the Feedback page or the support center.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">6. Cookies & Local Storage</h2>
            <p>Fluxcore uses essential cookies only (authentication session tokens). We do <strong>not</strong> use tracking cookies, analytics cookies, or advertising cookies.</p>
            <p>We use your browser's local storage to remember your language preference, cache UI translations, and record which workspace documents you have opened — so unread alerts clear once you have viewed them. This data stays on your device and is not transmitted to us.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">7. Security</h2>
            <p>All data is transmitted over HTTPS. Authentication tokens are stored securely. Database access is protected by row-level security policies ensuring users can only access data they are authorized to see.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">8. Language & AI Translations</h2>
            <p>Fluxcore's interface is offered in many languages. To make this possible, the text you read in non-English languages is generated <strong>automatically by an AI translation service</strong>. When you switch language, the strings you view are sent to our translation provider (Lovable AI Gateway) so they can be translated; results are cached in your browser to minimize repeat requests.</p>
            <p>The text we send is <strong>UI copy only</strong> — labels, buttons, page content. We do <strong>not</strong> send your personal data, ticket contents, member names, messages, or workspace data to the translation service.</p>
            <p>Translations may be inaccurate. The <strong>English version of the Service and these policies is the authoritative version</strong> for legal purposes.</p>
            <p>Our <strong>Support Center is English-only</strong>: tickets, messages, and AI assistance there are not translated, so the support team can respond accurately and quickly.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">9. Contact</h2>
            <p>For privacy-related questions, use the <button onClick={() => navigate("/feedback")} className="text-primary hover:underline">Feedback page</button> or contact us through the support center.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
