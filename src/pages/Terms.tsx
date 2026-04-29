import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/40 bg-background/90 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-lg font-extrabold text-gradient tracking-tight">Fluxcore</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: April 29, 2026 (multi-language support, owner document signing, and reliability improvements)</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By accessing or using Fluxcore ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Fluxcore is a group management platform designed for Roblox communities. The Service provides activity tracking, member management, session scheduling, and communication tools for Roblox group administrators and their teams.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Account & Verification</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You must verify your Roblox account through our bio code verification system or Roblox OAuth to use the Service. You are responsible for maintaining the security of your account. You must not share your workspace access keys with unauthorized individuals.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Acceptable Use</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">You agree not to:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Use the Service to violate Roblox's Terms of Service</li>
              <li>Attempt to gain unauthorized access to other workspaces</li>
              <li>Abuse the API or tracker system to send excessive requests</li>
              <li>Use the Service for any illegal or harmful activities</li>
              <li>Impersonate other users or misuse the verification system</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Premium Features</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Starting July 19, 2026, certain premium features will require purchase of a Roblox Gamepass (400 Robux). This helps us cover hosting and maintenance costs. Free features will remain available to all users.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Data & Privacy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We collect Roblox usernames, user IDs, and in-game activity data necessary to provide the Service. We do not sell your data to third parties. Activity data is stored securely and is only accessible to workspace owners and authorized members.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Service Availability</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We strive to maintain high availability but do not guarantee uninterrupted service. We reserve the right to modify, suspend, or discontinue the Service at any time with reasonable notice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Termination</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may terminate or suspend your access to the Service at our discretion if you violate these Terms. You may delete your workspace and stop using the Service at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Limitation of Liability</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Service is provided "as is" without warranties of any kind. Fluxcore shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Changes to Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">11. Language & Translations</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Fluxcore's interface is available in multiple languages. Translations outside of English are generated automatically using AI and provided for convenience only. They may contain inaccuracies. The <strong className="text-foreground">English version of the Service, these Terms, and our Privacy Policy is the authoritative version</strong>; in the event of any discrepancy, the English text controls.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our <strong className="text-foreground">Support Center is provided in English only</strong> to ensure clear communication and accurate troubleshooting between you and our team. Tickets, AI assistance, and staff replies are handled exclusively in English.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">12. Document Acknowledgements</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Workspaces may publish policies, handbooks, and similar documents that require digital acknowledgement. <strong className="text-foreground">Workspace owners and members</strong> who sign such documents (via checkbox, typed username, special word, or drawn signature) confirm they have read and agree to the contents of that document. Signature records are stored with a timestamp and the signer's identity within the workspace and are visible to the workspace owner and other members with relevant permissions.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Opening a document is also recorded in your browser as an acknowledgement that you have viewed it, which clears any "unread" notification for that document. This local view-tracking is independent of formal signing and is stored only on your device.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">13. Reliability & Auto-Recovery</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To keep the Service running smoothly, your browser may automatically reload Fluxcore if a page fails to load — for example after we deploy a new version. Reloads are rate-limited so they do not loop. No data you have already saved is lost.
            </p>
          </section>

            <p className="text-sm text-muted-foreground leading-relaxed">
              For questions about these Terms, contact us through our Roblox group or community channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
