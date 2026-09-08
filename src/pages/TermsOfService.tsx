import { usePageMeta } from "@/hooks/usePageMeta";
import { Link } from "react-router-dom";
import { ArrowLeft, Scale, CheckCircle2, AlertTriangle, FileText, UserCheck, ShieldCheck } from "lucide-react";

export default function TermsOfService() {
  usePageMeta({
    title: "Terms of Service | String Campus Marketplace",
    description: "Read the String Terms of Service. Understand the rules, escrow policies, and dispute resolution for buying and selling on Nigerian campuses.",
    url: "https://www.string.com.ng/terms",
    type: "website",
    keywords: ["String terms of service", "marketplace rules Nigeria", "campus delivery terms", "escrow policy"],
    structuredData: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Who is liable for defective products on String?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "String is a marketplace platform connecting buyers and sellers. Sellers are strictly liable for the quality of their goods. However, our Escrow system protects buyers from fraud by withholding funds until the item is verified."
          }
        },
        {
          "@type": "Question",
          "name": "What happens if a dispute is raised?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "If a buyer receives a defective item, the funds are frozen in escrow. Both parties must submit evidence. String's moderation team will review and refund the buyer if the seller is found at fault."
          }
        },
        {
          "@type": "Question",
          "name": "What items are prohibited on String?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Prohibited items include illegal substances, weapons, counterfeit goods, stolen property, and academic fraud materials (e.g., written assignments). Violators face instant permanent bans."
          }
        }
      ]
    }
  });

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 pt-32 pb-24 max-w-4xl relative z-10">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Terms of Service</h1>
          <p className="text-muted-foreground text-lg">Effective Date: August 26, 2026</p>
        </div>

        <div className="space-y-12 text-muted-foreground leading-relaxed">
          
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-foreground mb-6">
              <Scale className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">1. Acceptance of Terms</h2>
            </div>
            <p>By accessing and using String (the "Platform"), you agree to be bound by these Terms of Service. String operates as a hyper-local digital marketplace bridging verified merchants, freelancers, and students within Nigerian university campuses.</p>
            <p>If you do not agree to these terms, please do not use the Platform. We reserve the right to modify these terms at any time.</p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-foreground mb-6">
              <UserCheck className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">2. User Accounts & Verification</h2>
            </div>
            <h3 className="text-foreground font-semibold">2.1 Eligibility</h3>
            <p>You must be at least 16 years old to use String. Business profiles may require KYC (Know Your Customer) and physical location verification to operate on campus.</p>
            
            <h3 className="text-foreground font-semibold mt-4">2.2 Account Security</h3>
            <p>You are responsible for safeguarding your password and for all activities that occur under your account. String will not be liable for any loss or damage arising from your failure to secure your account.</p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-foreground mb-6">
              <ShieldCheck className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">3. Marketplace Liability & Escrow</h2>
            </div>
            <p>String is a platform. We do not own, manufacture, or directly sell the goods listed by third-party merchants (similar to Jiji or Jumia).</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Seller Liability:</strong> Vendors are entirely responsible for the accuracy of their listings, warranties, and the legality of the items they sell.</li>
              <li><strong>The Escrow System:</strong> To protect users, payments made via the platform are held in a secure escrow wallet. Funds are only released to the seller once the buyer confirms receipt of the item, or through our automated Proximity Sale Verification tool.</li>
              <li><strong>Dispute Resolution:</strong> If an item is significantly not as described, the buyer must raise a dispute within 24 hours of receipt. String acts as the final arbitrator in escrow disputes.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-foreground mb-6">
              <AlertTriangle className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">4. Prohibited Conduct</h2>
            </div>
            <p>The following items and actions are strictly prohibited and will result in an immediate permanent ban:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Selling illegal drugs, alcohol, or illicit substances.</li>
              <li>Selling weapons, explosives, or hazardous materials.</li>
              <li>Selling counterfeit goods or engaging in copyright infringement.</li>
              <li>Academic fraud (e.g., selling completed assignments, project works, or impersonation services).</li>
              <li>Harassment, hate speech, or threatening behavior in the String Chat.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-foreground mb-6">
              <CheckCircle2 className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">5. TikTok Integration & Automated Content Posting</h2>
            </div>
            <p>Our platform enables automated and scheduled media distribution to TikTok using the official TikTok for Developers Content Posting API and developer tooling. By connecting your TikTok account to our services, you acknowledge and agree to the following:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Authorization:</strong> You grant us permission to upload, publish, and schedule videos and multimedia content to your connected TikTok account strictly based on the schedules, media files, and prompts configured by you or your account workflows.</li>
              <li><strong>Content Ownership & Compliance:</strong> You retain full ownership and intellectual property rights of all videos, audio, and materials uploaded through our platform. You represent and warrant that all published content complies with the <a href="https://www.tiktok.com/community-guidelines" target="_blank" rel="noopener noreferrer" className="text-primary underline">TikTok Community Guidelines</a> and <a href="https://www.tiktok.com/legal/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-primary underline">TikTok Terms of Service</a>.</li>
              <li><strong>Prohibited Content:</strong> You may not use our TikTok publishing tools to post hateful, violent, harassing, infringing, sexually explicit, or fraudulent media. Any violation will result in immediate termination of API connectivity.</li>
              <li><strong>Revocation of Access:</strong> You may revoke our platform's access to your TikTok account at any time either directly within your TikTok account settings (Settings and Privacy &gt; Security &gt; Manage app permissions) or by disconnecting your profile within our platform dashboard.</li>
              <li><strong>Service Availability:</strong> While we aim for continuous automation, we are not responsible for delays or failed posts resulting from TikTok API rate limits, temporary downtime, or third-party network interruptions.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-foreground mb-6">
              <FileText className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">6. Governing Law</h2>
            </div>
            <p>These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any disputes arising out of these terms shall be subject to the exclusive jurisdiction of the Nigerian courts.</p>
          </section>

        </div>
      </main>
    </div>
  );
}
