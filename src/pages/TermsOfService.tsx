import { useState } from "react";
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
  Building,
  Lock,
  MessageSquare,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

export default function TermsOfService() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
    toast.success("Preparing PDF document for download...");
  };

  const sections = [
    {
      id: "acceptance",
      title: "1. Acceptance of Terms & Eligibility",
      content: `By accessing, registering for, or using the String platform (the "Service," "String," "we," "us," or "our"), including our web application, mobile interfaces, and associated APIs, you ("User," "Customer," or "Merchant") expressly agree to be bound by these Terms and Conditions ("Terms"). 
      
If you do not agree to these Terms in their entirety, you must immediately discontinue use of the platform.

• Eligibility: You must be at least 18 years of age or possess legal parental/guardian consent, and have the legal capacity under Nigerian Law to enter into binding agreements.
• Dual Account Nature: String provides a unified account experience allowing users to act as Customers (buyers/service seekers) and/or Merchants (businesses/service providers). Switching modes within the interface does not alter your overarching contractual obligations under these Terms.`
    },
    {
      id: "description",
      title: "2. Platform Description & Marketplace Model",
      content: `String is a digital directory, campus commerce coordinator, and localized discovery platform designed to connect verified students, creators, freelancers, and merchants with local buyers and clients.

• Role as Intermediary: String is an online communications and listing directory. Unless explicitly stated otherwise in writing, String does not own, manufacture, store, resell, or physically inspect items or services offered by third-party merchants.
• Campus Directory & Search: String facilitates discoverability using proximity geolocation, category taxonomy, and verified campus landmarks.
• Direct Buyer-Seller Dealings: Customers and Merchants negotiate, inspect goods, and consummate transactions directly via the in-app chat system or upon physical pickup/delivery.`
    },
    {
      id: "accounts",
      title: "3. Account Registration, KYC & IDIC Verification",
      content: `• Accurate Information: You agree to provide true, accurate, current, and complete registration data (including legal name, campus location, phone number, and email address) during onboarding and to maintain its accuracy.
• Identity Verification (IDIC): Merchants and students may undergo identity verification (IDIC) utilizing verified identity providers (e.g., Didit, government identity verification, or campus institutional credentials). Submitting fraudulent, altered, or stolen credentials constitutes a material breach and will result in immediate termination and referral to law enforcement.
• Account Security: You are solely responsible for safeguarding your login credentials. Any activity occurring under your account is your legal responsibility. Promptly notify String of any unauthorized account access.`
    },
    {
      id: "communication",
      title: "4. In-App Messaging & Communication Protocol",
      content: `• Direct Realtime Chat: String provides end-to-end in-app messaging, voice memos, image sharing, and direct quote delivery to facilitate safe inquiries.
• Anti-Scam & Safety Safeguards: For user security, messages and media exchanged on String are monitored by automated heuristic filters to prevent advance-fee fraud, harassment, impersonation, and illegal trade.
• Off-Platform Defection Warning: Users attempting to maliciously bypass safety protections, distribute phishing links, or harass counterparties will face instant permanent account suspension.`
    },
    {
      id: "monetization",
      title: "5. Business Boosts, Subscriptions & Paid Services",
      content: `• Visibility Boosting: Merchants may purchase optional monthly "Business Boost" or "Premium Tier" subscriptions to elevate their store's visibility in search and campus feeds.
• Payment Processing: All subscription fees and platform service fees are processed through authorized payment gateway partners (such as Squad by GTCO). String does not store raw credit/debit card numbers on its servers.
• Transparent View Tracking: In the interest of authentic metrics, String implements a strictly deduplicated view tracking engine ("1 Account = 1 Viewer"). Profile and listing views reflect distinct authenticated visitors, preventing artificial inflation.
• Non-Refundable Fees: Monthly visibility subscription fees are fully earned upon activation and are non-refundable, except where required by applicable consumer protection laws.`
    },
    {
      id: "content",
      title: "6. User-Generated Content & Intellectual Property",
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
      title: "7. Prohibited Platform Activities",
      content: `Users agree not to engage in any of the following:
• Reverse engineering, scraping, data mining, or decompiling the String platform or its APIs;
• Impersonating any person, business, university administrator, or String official;
• Manipulating search algorithms, injecting fraudulent reviews, or submitting fake orders;
• Introducing viruses, worms, malware, or any code designed to disrupt system integrity;
• Engaging in any fraudulent conduct, money laundering, or illegal campus syndicate activity.`
    },
    {
      id: "termination",
      title: "8. Account Termination & Right to Erasure",
      content: `• User Termination: You may delete your account at any time via Settings > Danger Zone > Delete Account. Upon deletion, your active listings, merchant store, and personal data will be purged in compliance with our Privacy Policy.
• String Suspension Rights: String reserves the right to immediately suspend, restrict, or terminate any user account without prior notice if we reasonably believe you have violated these Terms, engaged in fraudulent activity, or posed a risk to the campus community.`
    },
    {
      id: "liability",
      title: "9. Disclaimer of Warranties & Limitation of Liability",
      content: `• "As-Is" Provision: The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, whether express, statutory, or implied.
• Limitation of Damages: To the maximum extent permitted by Nigerian Law (including the Federal Competition and Consumer Protection Act 2018), String, its directors, employees, and affiliates shall not be liable for any indirect, punitive, incidental, special, or consequential damages arising from:
  - Any merchant's failure to deliver goods or perform services as advertised;
  - Physical loss, personal injury, or financial loss incurred during offline transactions or meetups;
  - Temporary service interruptions, server downtime, or third-party payment gateway delays.`
    },
    {
      id: "governing",
      title: "10. Dispute Resolution & Governing Law",
      content: `• Governing Law: These Terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria.
• Amicable Resolution: Any dispute, claim, or controversy arising out of or relating to these Terms shall first be submitted to String Customer Support for amicable settlement.
• Jurisdiction: In the event amicable settlement fails within thirty (30) days, the dispute shall be submitted to the exclusive jurisdiction of the competent courts of the Federal Republic of Nigeria.`
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
            <p className="text-xs font-bold text-black uppercase">Official Legal Terms of Service</p>
            <p className="text-[10px] text-neutral-500 font-mono">Document Version: 2026.4.1 • Effective August 2026</p>
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
              <Scale className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold tracking-tight">Legal Center</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/privacy">
              <Button variant="outline" size="sm" className="rounded-full text-xs font-semibold h-9 px-4">
                Privacy Policy
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
            Official Terms & Conditions
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground print:text-3xl print:text-black">
            Terms of Service & Platform Rules
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-mono print:text-neutral-600">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Last Revised: August 2026
            </span>
            <span>•</span>
            <span>Applicable Law: Federal Republic of Nigeria</span>
            <span>•</span>
            <span>Compliance: NDPA 2023 / FCCPA 2018</span>
          </div>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-3xl">
            Please read these Terms of Service carefully before utilizing the String marketplace, directory services, communication protocols, or merchant tools. These terms establish a legally binding contract between you and String Platform.
          </p>
        </div>

        {/* Quick Table of Contents (Screen Only) */}
        <div className="mb-10 p-5 rounded-2xl bg-muted/40 border border-border/40 print:hidden">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Table of Contents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-muted-foreground hover:text-primary transition-colors py-1 truncate"
              >
                {section.title}
              </a>
            ))}
          </div>
        </div>

        {/* Legal Clauses */}
        <div className="space-y-10 text-sm sm:text-base leading-relaxed print:space-y-6">
          {sections.map((section) => (
            <section 
              key={section.id} 
              id={section.id}
              className="space-y-3 scroll-mt-24 border-b border-border/20 pb-8 last:border-0 print:border-neutral-200 print:pb-4"
            >
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground print:text-base print:text-black">
                {section.title}
              </h2>
              <div className="text-muted-foreground print:text-neutral-800 whitespace-pre-line space-y-3 font-normal leading-7">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        {/* Printable Signature / Certification Block */}
        <div className="mt-16 pt-8 border-t border-border/40 space-y-4 print:mt-8 print:border-black">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-muted/30 border border-border/40 print:bg-white print:border-neutral-300">
            <div>
              <h3 className="font-bold text-sm text-foreground print:text-black">Questions or Legal Inquiries?</h3>
              <p className="text-xs text-muted-foreground print:text-neutral-600 mt-1">
                Contact our legal and compliance desk at <strong className="text-foreground print:text-black">support@string.com.ng</strong>
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
                Print Document
              </Button>
              <Link to="/privacy">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="rounded-full text-xs font-bold gap-1.5 h-9"
                >
                  View Privacy Rules
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
          <p className="text-[11px] text-center text-muted-foreground font-mono print:text-neutral-500">
            © {new Date().getFullYear()} String Platform (syntax-services/string). All rights reserved. Registered in Nigeria.
          </p>
        </div>
      </main>
    </div>
  );
}
