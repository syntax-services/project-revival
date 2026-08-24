import { useState } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Download, ExternalLink, Scale, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

// ==========================================
// QUANTUM PARTICLES BACKGROUND
// ==========================================
const QuantumParticles = () => {
  const particles = Array.from({ length: 25 }).map((_, i) => ({
    id: i,
    size: Math.random() * 4 + 1,
    x: Math.random() * 90 + 5,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-30">
      <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px]" />
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary/30 blur-[1px]"
          style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
          animate={{
            y: [0, -50, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.1, 0.5, 0.1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );
};

export default function TermsOfService() {
  usePageMeta({
    title: "Terms of Service & Community Guidelines",
    description: "Read String's official terms of service, safety policies, and transaction guidelines.",
    keywords: ["String terms of service", "legal policy", "NDPA compliance", "campus marketplace rules", "OOU terms"],
  });

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
      content: `By accessing, registering for, or using the String platform (the "Service," "String," "we," "us," or "our"), you expressly agree to be bound by these Terms and Conditions ("Terms"). 
      
If you do not agree to these Terms in their entirety, you must immediately discontinue use of the platform.

• Eligibility: You must be at least 18 years of age or possess legal parental/guardian consent, and have legal capacity under Nigerian Law to enter into binding agreements.
• Dual Account Structure: String provides a unified account experience allowing users to act as Customers (buyers/service seekers) and/or Merchants (businesses/service providers).`
    },
    {
      id: "safety",
      num: "02",
      title: "Mandatory Safety & Meetup Guidelines",
      tag: "Critical Safety Policy",
      content: `Your safety is our absolute highest priority. Because String facilitates real-world, local transactions, you must adhere to strict safety protocols:

• Public Meetups Only: Physical exchanges of goods, services, or cash MUST only occur in well-lit, highly populated public places (e.g., campus squares, university gates, busy cafeterias).
• Avoid Isolated Areas: Never agree to meet a buyer or seller in isolated locations, private dorm rooms, off-campus alleys, or unverified residential addresses to strictly avoid the risk of robbery, kidnapping, or physical harm.
• Daylight Hours: Conduct transactions during daylight hours whenever possible.
• String is an Intermediary: While we verify student identities, String is not physically present during exchanges. You assume responsibility for your personal safety during physical meetups.`
    },
    {
      id: "description",
      num: "03",
      title: "Platform Description & Marketplace Model",
      tag: "Directory & Escrow",
      content: `String is a digital directory and campus commerce coordinator designed to connect verified students, creators, freelancers, and merchants with campus buyers.

• Role as Intermediary: String is an online communications and listing directory. We do not own, manufacture, store, resell, or physically inspect items offered by third-party merchants.
• Direct Dealings: Customers and Merchants negotiate, inspect goods, and consummate transactions directly via the in-app chat system or upon physical pickup/delivery.`
    },
    {
      id: "accounts",
      num: "04",
      title: "Account Registration & Identity Verification",
      tag: "Trust & Safety",
      content: `• Accurate Information: You agree to provide true, accurate, current, and complete registration data during onboarding.
• Identity Verification: Merchants and students may undergo identity verification (IDIC). Submitting fraudulent credentials constitutes a material breach and will result in immediate termination and referral to statutory authorities.
• Account Security: You are solely responsible for safeguarding your login credentials. Any activity occurring under your account is your legal responsibility.`
    },
    {
      id: "prohibited",
      num: "05",
      title: "Prohibited Content & Intellectual Property",
      tag: "Content Standards",
      content: `• Ownership: You retain ownership of all product photographs, descriptions, and logos uploaded to String.
• Prohibited Items: You agree not to upload, post, or transmit:
  - Counterfeit, stolen, or infringing items;
  - Narcotics, prescription drugs, weapons, explosives, or illegal substances;
  - Escort services, pornography, or sexually explicit material;
  - Academic fraud (e.g., paid assignments, thesis writing for hire).`
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/20 overflow-x-hidden">
      <QuantumParticles />

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-background/80 backdrop-blur-xl border-b border-border/10 flex items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold text-sm">Back to Home</span>
        </Link>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-semibold"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Download PDF</span>
        </button>
      </header>

      <main className="pt-24 pb-20 px-4 md:px-6 max-w-3xl mx-auto relative z-10">
        
        {/* TITLE SECTION */}
        <div className="space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border/50 text-xs font-semibold text-muted-foreground mb-4">
            <Scale className="h-3.5 w-3.5" /> Legal Agreements
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.1]">
            Terms of Service
          </h1>
          <p className="text-muted-foreground font-medium text-sm md:text-base">
            Effective Date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* SAFETY ALERT */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 md:p-6 rounded-2xl bg-red-500/10 border border-red-500/20 mb-12"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-red-500">Critical Safety Requirement</h3>
              <p className="text-sm text-red-500/80 leading-relaxed">
                To prevent kidnapping, theft, or physical harm, you agree to only conduct physical transactions in well-lit, highly populated public spaces. Do not meet strangers in isolated or unverified private locations.
              </p>
            </div>
          </div>
        </motion.div>

        {/* CONTENT */}
        <div className="space-y-12">
          {sections.map((section, index) => (
            <motion.section 
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: index * 0.1 }}
              className="space-y-4 scroll-mt-24"
              id={section.id}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-primary/40 bg-primary/10 px-2 py-0.5 rounded-md">
                  {section.num}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {section.tag}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                {section.title}
              </h2>
              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {section.content}
              </div>
            </motion.section>
          ))}
        </div>

        {/* FOOTER */}
        <div className="mt-20 pt-8 border-t border-border/20 text-center space-y-4">
          <ShieldCheck className="h-8 w-8 text-muted-foreground/30 mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">
            By continuing to use String, you acknowledge that you have read, understood, and agreed to these terms.
          </p>
        </div>
      </main>
    </div>
  );
}
