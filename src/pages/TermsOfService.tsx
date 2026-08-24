import { useState } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Printer, 
  ShieldCheck, 
  Clock, 
  ExternalLink, 
  Scale,
  Building2,
  Lock,
  MessageSquare,
  ChevronRight,
  Shield,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function TermsOfService() {
  usePageMeta({
    title: "Terms of Service & Community Guidelines",
    description: "Read String's official terms of service, platform rules, merchant standards, and NDPA compliance policies.",
    keywords: ["String terms of service", "legal policy", "NDPA compliance", "campus marketplace rules", "OOU terms"],
  });

  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
    toast.success("Preparing document for print/download...");
  };

  const sections = [
    {
      id: "acceptance",
      num: "01",
      title: "Acceptance of Terms & Eligibility",
      tag: "Binding Contract",
      content: `By accessing, registering for, or using the String platform (the "Service," "String," "we," "us," or "our"), including our web application, mobile interfaces, and associated APIs, you ("User," "Customer," or "Merchant") expressly agree to be bound by these Terms and Conditions ("Terms"). 
      
If you do not agree to these Terms in their entirety, you must immediately discontinue use of the platform.

• Eligibility: You must be at least 18 years of age or possess legal parental/guardian consent, and have legal capacity under Nigerian Law to enter into binding agreements.
• Dual Account Structure: String provides a unified account experience allowing users to act as Customers (buyers/service seekers) and/or Merchants (businesses/service providers). Switching modes within the interface does not alter your overarching contractual obligations under these Terms.`
    },
    {
      id: "description",
      num: "02",
      title: "Platform Description & Marketplace Model",
      tag: "Directory & Escrow",
      content: `String is a digital directory, campus commerce coordinator, and localized discovery platform designed to connect verified students, creators, freelancers, and merchants with campus buyers and clients.

• Role as Intermediary: String is an online communications and listing directory. Unless explicitly stated otherwise in writing, String does not own, manufacture, store, resell, or physically inspect items or services offered by third-party merchants.
• Campus Directory & Search: String facilitates discoverability using proximity geolocation, category taxonomy, and verified campus landmarks (such as OOU Ago-Iwoye Main & Mini Campuses).
• Direct Dealings: Customers and Merchants negotiate, inspect goods, and consummate transactions directly via the in-app chat system or upon physical pickup/delivery.`
    },
    {
      id: "accounts",
      num: "03",
      title: "Account Registration & Identity Verification",
      tag: "Trust & Safety",
      content: `• Accurate Information: You agree to provide true, accurate, current, and complete registration data (including legal name, campus location, phone number, and email address) during onboarding and to maintain its accuracy.
• Identity Verification (IDIC): Merchants and students may undergo identity verification (IDIC) utilizing verified identity providers (e.g. Didit, government identity verification, or campus institutional credentials). Submitting fraudulent, altered, or stolen credentials constitutes a material breach and will result in immediate termination and referral to university and statutory authorities.
• Account Security: You are solely responsible for safeguarding your login credentials. Any activity occurring under your account is your legal responsibility. Promptly notify String of any unauthorized account access.`
    },
    {
      id: "communication",
      num: "04",
      title: "In-App Messaging & Communication Protocol",
      tag: "Safe Chat",
      content: `• Direct Realtime Chat: String provides end-to-end in-app messaging, image sharing, and direct quote delivery to facilitate safe campus inquiries.
• Anti-Scam & Safety Safeguards: For user security, messages and media exchanged on String are monitored by automated heuristic filters to prevent advance-fee fraud, harassment, impersonation, and illegal trade.
• Off-Platform Defection Warning: Users attempting to maliciously bypass safety protections, distribute phishing links, or harass counterparties will face instant permanent account suspension.`
    },
    {
      id: "monetization",
      num: "05",
      title: "Business Boosts & Paid Subscriptions",
      tag: "Transparent Metrics",
      content: `• Visibility Boosting: Merchants may purchase optional monthly "Business Boost" or "Premium Tier" subscriptions to elevate their store's visibility in search and campus feeds.
• Payment Processing: All subscription fees and platform service fees are processed through authorized payment gateway partners (such as Squad by GTCO). String does not store raw credit/debit card numbers on its servers.
• Transparent View Tracking: In the interest of authentic metrics, String implements a strictly deduplicated view tracking engine ("1 Account = 1 Viewer"). Profile and listing views reflect distinct authenticated visitors, preventing artificial inflation.
• Non-Refundable Fees: Monthly visibility subscription fees are fully earned upon activation and are non-refundable, except where required by applicable consumer protection laws.`
    },
    {
      id: "content",
      num: "06",
      title: "User-Generated Content & Intellectual Property",
      tag: "Content Standards",
      content: `• Ownership: You retain ownership of all product photographs, descriptions, logos, and reviews uploaded to String.
• License to String: By uploading content, you grant String a worldwide, perpetual, royalty-free, non-exclusive license to host, display, format, distribute, and promote your listings across the platform and its marketing channels.
• Prohibited Content: You agree not to upload, post, or transmit:
  - Counterfeit, stolen, or infringing items;
  - Narcotics, prescription drugs, weapons, explosives, or illegal substances;
  - Sexually explicit content, hate speech, defamatory material, or harassment;
  - Content that infringes on third-party trademarks, copyrights, or privacy rights.`
    },
    {
      id: "conduct",
      num: "07",
      title: "Prohibited Platform Activities",
      tag: "Enforcement",
      content: `Users agree not to engage in any of the following:
• Reverse engineering, scraping, data mining, or decompiling the String platform or its APIs;
• Impersonating any person, business, university administrator, or String official;
• Manipulating search algorithms, injecting fraudulent reviews, or submitting fake orders;
• Introducing viruses, worms, malware, or any code designed to disrupt system integrity;
• Engaging in any fraudulent conduct, money laundering, or illegal campus syndicate activity.`
    },
    {
      id: "liability",
      num: "08",
      title: "Disclaimer of Warranties & Limitation of Liability",
      tag: "FCCPA Compliant",
      content: `• "As-Is" Provision: The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, whether express, statutory, or implied.
• Limitation of Damages: To the maximum extent permitted by Nigerian Law (including the Federal Competition and Consumer Protection Act 2018), String, its directors, employees, and affiliates shall not be liable for any indirect, punitive, incidental, special, or consequential damages arising from:
  - Any merchant's failure to deliver goods or perform services as advertised;
  - Physical loss, personal injury, or financial loss incurred during offline transactions or meetups;
  - Temporary service interruptions, server downtime, or third-party payment gateway delays.`
    },
    {
      id: "governing",
      num: "09",
      title: "Dispute Resolution & Governing Law",
      tag: "Nigerian Law",
      content: `• Governing Law: These Terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria.
• Amicable Resolution: Any dispute, claim, or controversy arising out of or relating to these Terms shall first be submitted to String Customer Support for amicable settlement.
• Jurisdiction: In the event amicable settlement fails within thirty (30) days, the dispute shall be submitted to the exclusive jurisdiction of the competent courts of the Federal Republic of Nigeria.`
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
            <p className="text-xs font-bold text-black uppercase">Official Legal Terms of Service</p>
            <p className="text-[10px] text-neutral-500 font-mono">Document Version: 2026.4.2 • Effective August 2026</p>
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
              <Scale className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs sm:text-sm font-bold tracking-tight">Terms of Service</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link to="/privacy">
              <Button variant="ghost" size="sm" className="rounded-full text-[11px] sm:text-xs font-medium h-8 sm:h-9 px-2.5 sm:px-3">
                Privacy Policy
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
            Official Platform Guidelines
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground print:text-3xl print:text-black">
            Terms of Service & Rules
          </h1>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[11px] sm:text-xs text-muted-foreground font-mono print:text-neutral-600">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Revised August 2026
            </span>
            <span>•</span>
            <span>Nigerian Jurisdiction</span>
            <span>•</span>
            <span>NDPA & FCCPA</span>
          </div>

          <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed">
            Please review these Terms carefully before using the String campus marketplace, verified student directory, messaging network, or merchant tools.
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

        {/* Legal Clauses List */}
        <div className="space-y-6 sm:space-y-8 text-left print:space-y-4">
          {sections.map((section) => (
            <article 
              key={section.id} 
              id={section.id}
              className="scroll-mt-28 sm:scroll-mt-24 rounded-2xl sm:rounded-3xl border border-border/40 bg-card/60 backdrop-blur-sm p-4 sm:p-6 lg:p-7 shadow-xs space-y-3 transition-all hover:border-border/80 print:border-neutral-200 print:bg-white print:p-2"
            >
              <div className="flex items-center justify-between gap-2 border-b border-border/20 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    {section.num}
                  </span>
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
          ))}
        </div>

        {/* Printable & Interactive Footer Section */}
        <div className="pt-6 border-t border-border/40 space-y-4 text-left">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-card border border-border/40 shadow-xs print:bg-white print:border-neutral-300">
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-foreground print:text-black">Questions or Legal Inquiries?</h3>
              <p className="text-xs text-muted-foreground print:text-neutral-600 mt-0.5">
                Contact our legal and compliance desk at <strong className="text-foreground font-mono">support@string.com.ng</strong>
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
              <Link to="/privacy" className="flex-1 sm:flex-none">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="w-full rounded-xl text-xs font-bold gap-1.5 h-9"
                >
                  Privacy Rules
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
