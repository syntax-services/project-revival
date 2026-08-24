import { useState } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Download, Scale, Database, Lock, MapPin, Eye, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

// ==========================================
// QUANTUM PARTICLES BACKGROUND
// ==========================================
const QuantumParticles = () => {
  const particles = Array.from({ length: 25 }).map((_, i) => ({
    id: i,
    size: Math.random() * 4 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-30">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary/30 blur-[1px]"
          style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
          animate={{
            y: [0, -50, 0],
            x: [0, Math.random() * 30 - 15, 0],
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

export default function PrivacyPolicy() {
  usePageMeta({
    title: "Privacy Policy & Data Protection (NDPA Compliant)",
    description: "Learn how String protects your personal data, transactions, and campus location under Nigerian data privacy laws (NDPA).",
    keywords: ["String privacy policy", "data protection Nigeria", "NDPA compliance", "OOU privacy"],
  });

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
      content: `String Platform operates as a decentralized campus commerce directory and messaging service in Nigeria.

• Data Controller Contact: String Data Protection Officer (DPO), reachable via email at support@string.com.ng.
• Statutory Compliance: This Privacy Policy complies strictly with the Nigeria Data Protection Act 2023 (NDPA) and global best practices for digital commerce.`
    },
    {
      id: "safety-privacy",
      num: "02",
      title: "Physical Safety & Meetup Data Privacy",
      tag: "Critical Safety Policy",
      content: `While we protect your digital data, we mandate strict rules for your physical safety regarding the real-world transactions you coordinate on this platform:

• Public Meetups Only: Physical exchanges of goods or cash MUST only occur in well-lit, highly populated public spaces (e.g., campus squares, busy cafeterias).
• Avoid Isolated Areas: To avoid the risk of kidnapping, theft, or physical harm, NEVER agree to meet a buyer or seller in isolated locations, private dorm rooms, or unverified addresses. 
• Location Data: We process your location solely to show proximity. You should never share your precise real-time private location in chat unless meeting in a verified public zone.`
    },
    {
      id: "data-collected",
      num: "03",
      title: "Categories of Personal Data We Collect",
      tag: "Data Minimization",
      content: `We collect personal information directly from you and via verified service integrations:

A. Account & Identity Data: Legal Full Name, Email, Phone Number, and Profile Photograph. Identity Credentials submitted for verification.
B. Precise Geolocation: GPS Coordinates used strictly to calculate proximity distances for campus discoverability.
C. Marketplace Data: Product titles, descriptions, pricing, media, and reviews.
D. Communications: Direct in-app text messages, voice memos, photo attachments exchanged between buyers and merchants.`
    },
    {
      id: "legal-basis",
      num: "04",
      title: "Lawful Basis for Data Processing",
      tag: "Legal Grounds",
      content: `Under the NDPA, we process your personal data under the following lawful bases:

1. Performance of a Contract: To deliver the core service, maintain your account, route messages, and display catalogs.
2. Explicit User Consent: Where you grant permissions for device geolocation, camera access, and microphone recording.
3. Legitimate Interests: Detecting fraudulent account creation, enforcing platform safety, and deduplicating listing views.
4. Legal Obligation: Complying with mandatory disclosures required by Nigerian law enforcement.`
    },
    {
      id: "third-parties",
      num: "05",
      title: "Third-Party Data Processors",
      tag: "Secure Integrations",
      content: `We partner with enterprise-grade infrastructure providers. We do not sell your personal data to data brokers.

• Cloud Database & Authentication (Supabase): Stores encrypted database records and authentication tokens with Row Level Security (RLS) enforcement.
• Transactional Email Service (Resend): Delivers authentication OTPs and security notifications via TLS encrypted transport.`
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/20">
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
            <ShieldCheck className="h-3.5 w-3.5" /> Data Protection
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.1]">
            Privacy Policy
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
              <h3 className="font-bold text-red-500">Critical Meetup Safety Requirement</h3>
              <p className="text-sm text-red-500/80 leading-relaxed">
                While we secure your digital privacy, your physical safety is paramount. You agree to only conduct physical transactions in well-lit, highly populated public spaces. Do not meet strangers in isolated locations to prevent kidnapping, theft, or physical harm.
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
          <Database className="h-8 w-8 text-muted-foreground/30 mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">
            By continuing to use String, you acknowledge that you have read, understood, and agreed to this Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
}
