import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Shield, 
  Download, 
  Printer, 
  Lock, 
  Clock, 
  Scale, 
  Database,
  MapPin,
  Eye,
  Trash2,
  BellRing,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
    toast.success("Preparing PDF Privacy Document for download...");
  };

  const sections = [
    {
      id: "controller",
      title: "1. Data Controller & Statutory Framework",
      icon: Shield,
      content: `String Platform ("String," "we," "our," or "us") operates as a decentralized campus commerce directory and messaging service in Nigeria. 

• Data Controller Contact: String Data Protection Officer (DPO), reachable via email at support@string.com.ng.
• Statutory Compliance: This Privacy Policy complies with the Nigeria Data Protection Act 2023 (NDPA), the Nigeria Data Protection Regulation (NDPR), and global best practices for privacy and electronic communications.`
    },
    {
      id: "data-collected",
      title: "2. Categories of Personal Data We Collect",
      icon: Database,
      content: `We collect personal information directly from you, automatically through your device interactions, and via verified service integrations:

A. Account & Identity Data:
• Legal Full Name, Username/Handle, Email Address, Phone Number, and Profile Photograph (Avatar).
• Student/Business Identity Credentials (IDIC) submitted for verification through verified KYC services (Didit) or institutional document validation.

B. Precise Geolocation & Campus Location:
• GPS Coordinates (Latitude and Longitude), selected campus zone, nearest hall/hostel landmark, and delivery address.
• Geolocation data is used strictly to calculate proximity distances for campus discoverability, local search sorting, and fraud prevention.

C. Marketplace & Merchant Catalog Data:
• Product titles, descriptions, pricing, inventory metadata, and uploaded high-resolution media.
• Service listings, quotes, requests for quotations (RFQs), reviews, and star ratings.

D. Communications & Message Data:
• Direct in-app text messages, voice memos, photo attachments, quotes, and delivery coordinates exchanged between buyers and merchants.
• Communications metadata (message timestamps, delivery receipts, unread conversation counts).

E. Usage, Engagement & Unique View Analytics:
• Deduplicated Profile Views: We log unique authenticated viewer IDs to provide merchants with accurate analytics ("1 Account = 1 Viewer") without inflating view counts.
• Saved bookmarks, merchant follow actions, search history queries, and referral attribution codes.`
    },
    {
      id: "legal-basis",
      title: "3. Lawful Basis for Data Processing",
      icon: Scale,
      content: `Under the Nigeria Data Protection Act 2023, we process your personal data under the following lawful bases:

1. Performance of a Contract: Processing is necessary to deliver the core service, maintain your account, route messages, and display merchant catalogs.
2. Explicit User Consent: Where you grant permissions for device geolocation, camera access, audio microphone recording for voice notes, and marketing communications.
3. Legitimate Interests: Detecting fraudulent account creation, enforcing platform safety, deduplicating listing views, and maintaining server stability.
4. Legal Obligation: Complying with mandatory disclosures required by Nigerian law enforcement or statutory regulators.`
    },
    {
      id: "third-parties",
      title: "4. Third-Party Data Processors & Sub-Processors",
      icon: Lock,
      content: `We partner with enterprise-grade infrastructure providers to deliver reliable services. We do not sell your personal data to data brokers.

• Cloud Database & Authentication (Supabase): Stores encrypted database records, authentication tokens, and user credentials with Row Level Security (RLS) enforcement.
• Transactional Email Service (Resend): Delivers authentication OTPs, account security notifications, and admin broadcast updates via TLS encrypted transport.
• Payment Processing (Squad by GTCO): Processes optional merchant subscription payments. Financial card details are tokenized directly by the payment processor and are never stored on String servers.
• Identity Verification (Didit / IDIC): Processes document verification hashes to award verified merchant badges.`
    },
    {
      id: "cookies-storage",
      title: "5. Local Device Storage & Cache Policy",
      icon: Eye,
      content: `String utilizes browser LocalStorage and SessionStorage to enhance speed, offline resilience, and state retention:

• Session & Authentication: Local storage of non-sensitive access tokens for active sessions.
• User Experience Preferences: Theme mode (dark/light), custom accent color palettes, and draft message forms.
• Offline Discovery Caching: Bookmarked merchants and scroll position memory for fluid discovery navigation.`
    },
    {
      id: "retention-deletion",
      title: "6. Data Retention & Account Deletion (Right to Erasure)",
      icon: Trash2,
      content: `• Retention Period: We retain your personal data for as long as your account remains active or as required by applicable Nigerian commercial retention regulations.
• Permanent Account Deletion: You retain an unconditional right to delete your account and personal data at any time via Settings > Account Deletion.
• Purge Execution: When you confirm account deletion:
  - Your profile, customer record, merchant store, and product catalog are permanently deleted.
  - All media attachments stored in private buckets are purged from CDN caches.
  - Your direct messages and active listings are permanently removed from live database indexes.`
    },
    {
      id: "user-rights",
      title: "7. Your Statutory Rights Under NDPA / NDPR",
      icon: ShieldCheck,
      content: `As a data subject in Nigeria, you possess the following enforceable rights:

• Right to Access: Request a copy of the personal data String holds regarding your account.
• Right to Rectification: Modify or update inaccurate profile data directly in your account settings.
• Right to Erasure ("Right to be Forgotten"): Request total deletion of your personal information.
• Right to Object / Withdraw Consent: Revoke location permissions or opt out of non-essential marketing broadcasts.
• Right to Lodge a Complaint: You have the right to lodge a formal complaint with the Nigeria Data Protection Commission (NDPC) if you believe your data has been processed unlawfully.`
    },
    {
      id: "security",
      title: "8. Security Measures & Encryption",
      icon: Lock,
      content: `We implement rigorous physical, organizational, and technical security controls:

• TLS 1.3 encryption in transit for all web traffic, API calls, and socket connections.
• Database AES-256 encryption at rest with strict PostgreSQL Row Level Security (RLS).
• Asset URL masking and signed storage bucket policies to prevent unauthorized file harvesting.
• Rate limiting and IP anomaly detection to protect against brute-force attacks and automated scrapers.`
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Print-Only Branded Header */}
      <div className="hidden print:block mb-8 border-b border-black pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">STRING PLATFORM</h1>
            <p className="text-xs text-neutral-600 font-mono">syntax-services/string • Campus Commerce Ecosystem</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-black uppercase">Official Privacy Policy & Data Consent Rules</p>
            <p className="text-[10px] text-neutral-500 font-mono">NDPA 2023 / NDPR Compliant • Version 2026.4.1</p>
          </div>
        </div>
      </div>

      {/* Screen Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-16 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(-1)} 
              className="rounded-full h-9 px-3 gap-1.5 hover:bg-muted font-medium text-xs"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="h-4 w-[1px] bg-border/60" />
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold tracking-tight">Privacy & Data Governance</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/terms">
              <Button variant="outline" size="sm" className="rounded-full text-xs font-semibold h-9 px-4">
                Terms of Service
              </Button>
            </Link>
            <Button 
              onClick={handlePrint}
              size="sm" 
              className="rounded-full text-xs font-bold h-9 px-4 gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </Button>
          </div>
        </div>
      </header>

      {/* Main Document Content */}
      <main className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/* Document Hero */}
        <div className="mb-10 space-y-4 border-b border-border/40 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider print:hidden">
            <ShieldCheck className="h-3.5 w-3.5" />
            Privacy Policy & Data Protection Rules
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground print:text-3xl print:text-black">
            Privacy Policy & Consent Agreement
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-mono print:text-neutral-600">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Effective: August 2026
            </span>
            <span>•</span>
            <span>Framework: Nigeria Data Protection Act 2023 (NDPA)</span>
            <span>•</span>
            <span>Governing Authority: NDPC (Nigeria)</span>
          </div>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-3xl">
            This Privacy Policy describes how String collects, utilizes, safeguards, and provides user control over your personal data when navigating the marketplace, messaging counterparties, and utilizing merchant tools.
          </p>
        </div>

        {/* Legal Clauses */}
        <div className="space-y-10 text-sm sm:text-base leading-relaxed print:space-y-6">
          {sections.map((section) => {
            const IconComponent = section.icon;
            return (
              <section 
                key={section.id} 
                id={section.id}
                className="space-y-3 scroll-mt-24 border-b border-border/20 pb-8 last:border-0 print:border-neutral-200 print:pb-4"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary print:hidden">
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground print:text-base print:text-black">
                    {section.title}
                  </h2>
                </div>
                <div className="text-muted-foreground print:text-neutral-800 whitespace-pre-line space-y-3 font-normal leading-7">
                  {section.content}
                </div>
              </section>
            );
          })}
        </div>

        {/* Printable Footer / Data Protection Desk */}
        <div className="mt-16 pt-8 border-t border-border/40 space-y-4 print:mt-8 print:border-black">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-muted/30 border border-border/40 print:bg-white print:border-neutral-300">
            <div>
              <h3 className="font-bold text-sm text-foreground print:text-black">Data Protection & Privacy Officer</h3>
              <p className="text-xs text-muted-foreground print:text-neutral-600 mt-1">
                For subject access requests or data inquiries: <strong className="text-foreground print:text-black">support@string.com.ng</strong>
              </p>
            </div>
            <div className="flex items-center gap-3 print:hidden">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrint}
                className="rounded-full text-xs font-semibold gap-1.5 h-9"
              >
                <Printer className="h-3.5 w-3.5" />
                Print PDF
              </Button>
              <Link to="/terms">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="rounded-full text-xs font-bold gap-1.5 h-9"
                >
                  View Terms of Service
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
          <p className="text-[11px] text-center text-muted-foreground font-mono print:text-neutral-500">
            © {new Date().getFullYear()} String Platform. All rights reserved. Data Protection Compliance under NDPA 2023.
          </p>
        </div>
      </main>
    </div>
  );
}
