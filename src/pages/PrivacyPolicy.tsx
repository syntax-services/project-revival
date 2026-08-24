import { useState } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
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
  ShieldCheck,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PrivacyPolicy() {
  usePageMeta({
    title: "Privacy Policy & Data Protection (NDPA Compliant)",
    description: "Learn how String protects your personal data, transactions, and campus location under Nigerian data privacy laws (NDPA).",
    keywords: ["String privacy policy", "data protection Nigeria", "NDPA compliance", "OOU privacy"],
  });

  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
    toast.success("Preparing Privacy Document for print/download...");
  };

  const sections = [
    {
      id: "controller",
      num: "01",
      title: "Data Controller & Statutory Framework",
      tag: "NDPA 2023",
      icon: Shield,
      content: `String Platform ("String," "we," "our," or "us") operates as a decentralized campus commerce directory and messaging service in Nigeria.

• Data Controller Contact: String Data Protection Officer (DPO), reachable via email at support@string.com.ng.
• Statutory Compliance: This Privacy Policy complies strictly with the Nigeria Data Protection Act 2023 (NDPA), the Nigeria Data Protection Regulation (NDPR), and global best practices for digital commerce and electronic communications.`
    },
    {
      id: "data-collected",
      num: "02",
      title: "Categories of Personal Data We Collect",
      tag: "Data Minimization",
      icon: Database,
      content: `We collect personal information directly from you, automatically through your device interactions, and via verified service integrations:

A. Account & Identity Data:
• Legal Full Name, Email Address, Phone Number, and Profile Photograph (Avatar).
• Student/Business Identity Credentials (IDIC) submitted for verification through verified KYC services (Didit) or institutional document validation.

B. Precise Geolocation & Campus Location:
• GPS Coordinates (Latitude and Longitude), selected campus zone (e.g. OOU Main Campus or Mini Campus Ago-Iwoye), nearest hall/hostel landmark, and delivery address.
• Geolocation data is used strictly to calculate proximity distances for campus discoverability, local search sorting, and fraud prevention.

C. Marketplace & Merchant Catalog Data:
• Product titles, descriptions, pricing, inventory metadata, and uploaded high-resolution media.
• Service listings, quotes, requests for quotations (RFQs), reviews, and star ratings.

D. Communications & Message Data:
• Direct in-app text messages, voice memos, photo attachments, quotes, and delivery coordinates exchanged between buyers and merchants.
• Communications metadata (message timestamps, delivery receipts, unread conversation counts).

E. Usage, Engagement & Unique View Analytics:
• Deduplicated Profile Views: We log unique authenticated viewer IDs to provide merchants with authentic analytics ("1 Account = 1 Viewer") without inflating view counts.`
    },
    {
      id: "legal-basis",
      num: "03",
      title: "Lawful Basis for Data Processing",
      tag: "Legal Grounds",
      icon: Scale,
      content: `Under the Nigeria Data Protection Act 2023, we process your personal data under the following lawful bases:

1. Performance of a Contract: Processing is necessary to deliver the core service, maintain your account, route messages, and display merchant catalogs.
2. Explicit User Consent: Where you grant permissions for device geolocation, camera access, audio microphone recording for voice notes, and marketing communications.
3. Legitimate Interests: Detecting fraudulent account creation, enforcing platform safety, deduplicating listing views, and maintaining server stability.
4. Legal Obligation: Complying with mandatory disclosures required by Nigerian law enforcement or statutory regulators.`
    },
    {
      id: "third-parties",
      num: "04",
      title: "Third-Party Data Processors & Sub-Processors",
      tag: "Secure Integrations",
      icon: Lock,
      content: `We partner with enterprise-grade infrastructure providers to deliver reliable services. We do not sell your personal data to data brokers.

• Cloud Database & Authentication (Supabase): Stores encrypted database records, authentication tokens, and user credentials with Row Level Security (RLS) enforcement.
• Transactional Email Service (Resend): Delivers authentication OTPs, account security notifications, and admin broadcast updates via TLS encrypted transport.
• Payment Processing (Squad by GTCO): Processes optional merchant subscription payments. Financial card details are tokenized directly by the payment processor and are never stored on String servers.
• Identity Verification (Didit / IDIC): Processes document verification hashes to award verified merchant badges.`
    },
    {
      id: "cookies-storage",
      num: "05",
      title: "Local Device Storage & Cache Policy",
      tag: "Client-Side Cache",
      icon: Eye,
      content: `String utilizes browser LocalStorage and SessionStorage to enhance speed, offline resilience, and state retention:

• Authentication Tokens: Cached temporarily in secure storage to maintain active sessions across page reloads.
• UI Preferences: Stores dark/light mode and theme palette preferences.
• Location Cache: Caches your selected campus to eliminate redundant location lookups.`
    },
    {
      id: "retention",
      num: "06",
      title: "Data Retention & Security Safeguards",
      tag: "Encryption",
      icon: Clock,
      content: `• Retention Period: Personal data is retained only as long as your account remains active or as required by statutory financial regulations.
• Security Architecture:
  - Encryption in Transit: Enforced HTTPS/TLS 1.3 encryption across all API and WebSocket endpoints.
  - Encryption at Rest: Database volumes and sensitive fields are encrypted using industry-standard AES-256 encryption.
  - Access Controls: Granular Row Level Security (RLS) restricts access so merchants cannot access unrelated user records.`
    },
    {
      id: "rights",
      num: "07",
      title: "Your Statutory Data Subject Rights",
      tag: "Your Rights",
      icon: Trash2,
      content: `Under the Nigeria Data Protection Act (NDPA 2023), you possess the following actionable rights:

• Right of Access: You may request a complete export of personal data held about you by contacting support@string.com.ng.
• Right to Rectification: Update or correct inaccurate profile details anytime via your Account Settings.
• Right to Erasure / Restriction: You may request data restriction or account deletion at any time through our verified support channel.
• Right to Object: You may opt out of promotional communications at any time.`
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 pb-16 sm:pb-24">
      {/* Print-Only Branded Header */}
      <div className="hidden print:block mb-8 border-b border-black pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black">STRING PLATFORM</h1>
            <p className="text-xs text-neutral-600 font-mono">syntax-services/string • Campus Commerce Ecosystem</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-black uppercase">Official Privacy Policy</p>
            <p className="text-[10px] text-neutral-500 font-mono">Document Version: 2026.4.2 • NDPA Compliant</p>
          </div>
        </div>
      </div>

      {/* Mobile-First Sticky Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/90 backdrop-blur-xl print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(-1)} 
              className="rounded-full h-8 sm:h-9 px-2.5 sm:px-3 gap-1 hover:bg-muted font-medium text-xs"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden xs:inline">Back</span>
            </Button>
            <div className="h-4 w-[1px] bg-border/60" />
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs sm:text-sm font-bold tracking-tight">Privacy Policy</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link to="/terms">
              <Button variant="ghost" size="sm" className="rounded-full text-[11px] sm:text-xs font-medium h-8 sm:h-9 px-2.5 sm:px-3">
                Terms of Service
              </Button>
            </Link>
            <Button 
              onClick={handlePrint}
              size="sm" 
              className="rounded-full text-[11px] sm:text-xs font-bold h-8 sm:h-9 px-3 sm:px-4 gap-1.5 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span> PDF
            </Button>
          </div>
        </div>

        {/* Horizontal Scrollable Section Bar on Mobile */}
        <div className="flex sm:hidden overflow-x-auto no-scrollbar border-t border-border/20 px-4 py-2 gap-2 bg-muted/20">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium bg-card border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
            >
              § {s.num}
            </a>
          ))}
        </div>
      </header>

      {/* Main Document Content */}
      <main className="max-w-4xl mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        
        {/* Document Hero */}
        <div className="space-y-3 sm:space-y-4 border-b border-border/40 pb-6 sm:pb-8 text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] sm:text-xs font-bold uppercase tracking-wider print:hidden">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            Data Protection & Privacy Notice
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground print:text-3xl print:text-black">
            Privacy Policy & Data Security
          </h1>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[11px] sm:text-xs text-muted-foreground font-mono print:text-neutral-600">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Revised August 2026
            </span>
            <span>•</span>
            <span>NDPA 2023 Compliant</span>
            <span>•</span>
            <span>AES-256 Encrypted</span>
          </div>

          <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed">
            This Privacy Policy explains how String Platform processes, safeguards, and respects your personal data across all services and applications.
          </p>
        </div>

        {/* Quick Table of Contents (Desktop/Tablet Card) */}
        <div className="hidden sm:block p-5 rounded-2xl bg-card border border-border/40 shadow-xs print:hidden text-left">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Table of Contents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-muted-foreground hover:text-primary transition-colors py-1 flex items-center gap-2 truncate"
              >
                <span className="font-mono text-[10px] text-primary/70">{section.num}.</span>
                <span className="truncate">{section.title}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Privacy Clauses List */}
        <div className="space-y-6 sm:space-y-8 text-left print:space-y-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <article 
                key={section.id} 
                id={section.id}
                className="scroll-mt-28 sm:scroll-mt-24 rounded-2xl sm:rounded-3xl border border-border/40 bg-card/60 backdrop-blur-sm p-4 sm:p-6 lg:p-7 shadow-xs space-y-3 transition-all hover:border-border/80 print:border-neutral-200 print:bg-white print:p-2"
              >
                <div className="flex items-center justify-between gap-2 border-b border-border/20 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <h2 className="text-sm sm:text-lg font-bold tracking-tight text-foreground print:text-base print:text-black">
                      {section.title}
                    </h2>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-muted/60 hidden xs:inline">
                    {section.tag}
                  </span>
                </div>

                <div className="text-xs sm:text-sm text-muted-foreground print:text-neutral-800 whitespace-pre-line space-y-2.5 font-normal leading-relaxed">
                  {section.content}
                </div>
              </article>
            );
          })}
        </div>

        {/* Interactive Footer Section */}
        <div className="pt-6 border-t border-border/40 space-y-4 text-left">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-card border border-border/40 shadow-xs print:bg-white print:border-neutral-300">
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-foreground print:text-black">Privacy or Data Rights Questions?</h3>
              <p className="text-xs text-muted-foreground print:text-neutral-600 mt-0.5">
                Reach our Data Protection Officer directly at <strong className="text-foreground font-mono">support@string.com.ng</strong>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto print:hidden">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrint}
                className="flex-1 sm:flex-none rounded-xl text-xs font-semibold gap-1.5 h-9"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </Button>
              <Link to="/terms" className="flex-1 sm:flex-none">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="w-full rounded-xl text-xs font-bold gap-1.5 h-9"
                >
                  Terms of Service
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] text-center text-muted-foreground font-mono print:text-neutral-500">
            © {new Date().getFullYear()} String Platform (syntax-services/string). All rights reserved. Registered in Nigeria.
          </p>
        </div>

      </main>
    </div>
  );
}
