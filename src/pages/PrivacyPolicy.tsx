import { usePageMeta } from "@/hooks/usePageMeta";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Database, Lock, MapPin, Eye, AlertTriangle } from "lucide-react";

export default function PrivacyPolicy() {
  usePageMeta({
    title: "Privacy Policy | String Campus Marketplace",
    description: "Read String's Privacy Policy. Learn how we protect your personal data, location data, and transactions on Nigeria's safest campus marketplace.",
    url: "https://www.string.com.ng/privacy",
    type: "website",
    keywords: ["String privacy policy", "data protection Nigeria", "NDPR compliance", "campus marketplace privacy"],
    structuredData: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How does String protect my payment data?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "String uses secure escrow services and encrypted payment gateways (like Squad/GTCO) to process transactions. We never store your raw credit card details on our servers."
          }
        },
        {
          "@type": "Question",
          "name": "Does String track my location?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "String only requests location data during the 'Proximity Sale Verification' process to ensure the buyer and seller are physically at the same meetup spot. We do not track your location in the background."
          }
        },
        {
          "@type": "Question",
          "name": "Is my data shared with third parties?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "String does not sell your personal data. We only share necessary order details with sellers or delivery runners to facilitate your transaction on campus."
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
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground text-lg">Effective Date: August 26, 2026</p>
        </div>

        <div className="space-y-12 text-muted-foreground leading-relaxed">
          
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-foreground mb-6">
              <ShieldCheck className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">1. Introduction</h2>
            </div>
            <p>Welcome to String ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy governs the manner in which String collects, uses, maintains, and discloses information collected from users (each, a "User") of the https://www.string.com.ng website and mobile application.</p>
            <p>This policy applies to all products, services, and features offered by String, specifically tailored for the hyper-local Nigerian university campus ecosystem. By using our platform, you consent to the data practices described in this statement, in compliance with the Nigerian Data Protection Regulation (NDPR).</p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-foreground mb-6">
              <Database className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">2. Information We Collect</h2>
            </div>
            <h3 className="text-foreground font-semibold">2.1 Personal Identification Information</h3>
            <p>We may collect personal identification information from Users in a variety of ways, including, but not limited to, when Users visit our site, register on the site, list a product, place an order, and in connection with other activities, services, features or resources we make available on our Site. Users may be asked for, as appropriate: name, email address, phone number, university affiliation, and student ID (for merchant verification).</p>
            
            <h3 className="text-foreground font-semibold mt-4">2.2 Proximity & Location Data</h3>
            <p>To facilitate our unique "Chat-to-Buy Proximity Verification" feature, String requests real-time location data (GPS coordinates) exclusively when a buyer and seller are confirming a physical transaction. <strong className="text-foreground">We do not track continuous background location.</strong> Location data is used strictly to calculate the Haversine distance between parties to unlock the escrow payout and review system.</p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-foreground mb-6">
              <Lock className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">3. How We Use Collected Information</h2>
            </div>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>To process payments securely:</strong> We use escrow infrastructure. Your payment details are processed by compliant gateways (e.g., Squad/GTCO) and are not stored in raw format on our servers.</li>
              <li><strong>To facilitate campus commerce:</strong> To connect buyers with verified sellers and dispatch runners.</li>
              <li><strong>To prevent fraud:</strong> Our system analyzes behavioral patterns and physical proximity pings to prevent fraudulent reviews and fake vendor scams.</li>
              <li><strong>To improve user experience:</strong> We use aggregate data to understand how our student demographics use the platform.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-foreground mb-6">
              <Eye className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">4. How We Protect Your Information</h2>
            </div>
            <p>We adopt appropriate data collection, storage and processing practices and security measures to protect against unauthorized access, alteration, disclosure or destruction of your personal information, username, password, transaction information and data stored on our Site. Sensitive and private data exchange between the Site and its Users happens over an SSL secured communication channel and is encrypted and protected with digital signatures.</p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-foreground mb-6">
              <MapPin className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">5. Sharing Your Personal Information</h2>
            </div>
            <p>We do not sell, trade, or rent Users personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification information regarding visitors and users with our business partners, trusted affiliates and advertisers. We will share your campus delivery landmark and contact details with verified delivery runners or merchants *only* upon your explicit confirmation of an order.</p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-foreground mb-6">
              <AlertTriangle className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">6. Changes to this Privacy Policy</h2>
            </div>
            <p>String has the discretion to update this privacy policy at any time. When we do, we will post a notification on the main page of our Site and revise the updated date at the bottom of this page. We encourage Users to frequently check this page for any changes to stay informed about how we are helping to protect the personal information we collect.</p>
          </section>

        </div>
      </main>
    </div>
  );
}
