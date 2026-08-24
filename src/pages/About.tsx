import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  MessageCircle, TrendingUp, ShieldCheck, 
  ArrowRight, MapPin, Globe, CheckCircle2, 
  Lock, Users, Package, AlertTriangle, Search
} from "lucide-react";

import stringLogoLight from "@/assets/string-logo-light.png";
import stringLogoDark from "@/assets/String-logo-dark.png";

// ==========================================
// QUANTUM PARTICLES BACKGROUND (GLITCH-FREE)
// ==========================================
const QuantumParticles = () => {
  // Generate random particles that float in the background
  // Constrain X to 5% - 95% to absolutely prevent horizontal overflow
  const particles = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    size: Math.random() * 3 + 1,
    x: Math.random() * 90 + 5,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 5,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
      <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px]" />
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary/40 blur-[1px]"
          style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
          animate={{
            y: [0, -60, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.1, 0.6, 0.1],
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

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function About() {
  const giftRef = useRef<HTMLDivElement>(null);
  const giftInView = useInView(giftRef, { margin: "-150px 0px" });

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 relative overflow-x-hidden">
      <QuantumParticles />

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-background/80 backdrop-blur-xl border-b border-border/10 flex items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <img src={stringLogoLight} alt="String" className="h-10 w-auto logo-light group-hover:scale-105 transition-transform" />
          <img src={stringLogoDark} alt="String" className="h-10 w-auto logo-dark group-hover:scale-105 transition-transform" />
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors px-2">Home</Link>
          <Link to="/auth" className="bg-primary text-primary-foreground px-5 py-2 rounded-full hover:bg-primary/90 transition-colors shadow-sm">
            Sign In
          </Link>
        </nav>
      </header>

      <main className="pt-24 pb-20 px-4 md:px-6 max-w-4xl mx-auto space-y-32 relative z-10">
        
        {/* HERO SECTION */}
        <section className="text-center space-y-6 pt-12 md:pt-24">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, type: "spring", bounce: 0.4 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1]"
          >
            Rewiring <br />
            <span className="text-primary">
              Campus Commerce
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium"
          >
            String is built to make buying and selling around campus incredibly simple, safe, and social. 
            We are solving the massive problems left behind by legacy e-commerce platforms in Nigeria.
          </motion.p>
        </section>

        {/* THE PROBLEM WITH EXISTING PLATFORMS */}
        <section className="space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">Why we built String</h2>
            <p className="text-muted-foreground font-medium text-sm md:text-base max-w-xl mx-auto">
              Legacy platforms weren't built for the dynamic, hyper-local reality of campus life.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* The Classifieds Problem */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="p-6 md:p-8 rounded-3xl bg-primary/5 border border-primary/10 space-y-4"
            >
              <div className="flex items-center gap-3 text-primary font-bold">
                <AlertTriangle className="h-6 w-6" />
                The Classifieds Problem
              </div>
              <h3 className="text-lg font-bold">Zero Trust & Scams</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                On general classifieds, anyone can post anything anonymously. This leads to rampant scams, fake products, and the notorious "what I ordered vs what I got" anxiety. There is zero buyer protection.
              </p>
            </motion.div>

            {/* The Retail Giant Problem */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              className="p-6 md:p-8 rounded-3xl bg-primary/5 border border-primary/10 space-y-4"
            >
              <div className="flex items-center gap-3 text-primary font-bold">
                <Package className="h-6 w-6" />
                The Retail Giant Problem
              </div>
              <h3 className="text-lg font-bold">Slow & Expensive Logistics</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                On massive platforms, shipping to a university campus takes days or weeks. The delivery fees often cost more than the item itself, making it useless for daily student needs.
              </p>
            </motion.div>
          </div>

          {/* The String Solution */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="p-8 md:p-10 rounded-[2.5rem] bg-gradient-to-br from-primary/10 via-background to-primary/5 border border-primary/20 shadow-2xl relative overflow-hidden"
          >
            <div className="flex items-center gap-3 text-primary font-black text-xl mb-6">
              <CheckCircle2 className="h-8 w-8" />
              The String Solution
            </div>
            
            <div className="grid sm:grid-cols-2 gap-6 relative z-10">
              <div className="space-y-2">
                <h4 className="font-bold flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /> Verified Trust</h4>
                <p className="text-sm text-muted-foreground">Every seller is a verified student or local campus merchant. You know exactly who you are dealing with.</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Hyper-Local Speed</h4>
                <p className="text-sm text-muted-foreground">Why wait days? Your seller is in the next hostel. Delivery takes minutes with zero shipping fees.</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" /> Real-Time Negotiation</h4>
                <p className="text-sm text-muted-foreground">Chat, haggle, and send voice notes directly in the app. No need to share personal numbers on WhatsApp.</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold flex items-center gap-2"><Search className="h-4 w-4 text-primary" /> Socialized Feed</h4>
                <p className="text-sm text-muted-foreground">Follow your favorite sellers. Your feed adapts to what you love, making discovery effortless.</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* THE SURPRISE SECTION */}
        <section ref={giftRef} className="py-20 relative text-center">
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="space-y-4 max-w-xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">We Love Surprises</h2>
              <p className="text-muted-foreground text-sm font-medium">
                We are constantly building tools to help our buyers and sellers win. Here is a sneak peek at what's dropping soon.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Feature 1: Escrow */}
              <motion.div 
                animate={giftInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 30 }}
                transition={{ duration: 0.6, type: "spring", bounce: 0.4, delay: 0.1 }}
                className="relative flex flex-col items-center text-center p-8 rounded-[2rem] bg-primary/5 border border-primary/10 hover:border-primary/30 transition-colors overflow-hidden"
              >
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-5 relative z-10">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-black text-lg mb-2 relative z-10 text-foreground">
                  Zero-Risk Escrow
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed relative z-10">
                  Pay securely in-app. Funds are only released to the seller <strong>after</strong> you confirm you received exactly what you ordered.
                </p>
              </motion.div>

              {/* Feature 2: Services & Gigs */}
              <motion.div 
                animate={giftInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 30 }}
                transition={{ duration: 0.6, type: "spring", bounce: 0.4, delay: 0.2 }}
                className="relative flex flex-col items-center text-center p-8 rounded-[2rem] bg-primary/5 border border-primary/10 hover:border-primary/30 transition-colors overflow-hidden"
              >
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-5 relative z-10">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-black text-lg mb-2 relative z-10 text-foreground">
                  Student Gigs
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed relative z-10">
                  Need a quick flyer, a haircut, or someone to run errands? Soon you'll be able to hire verified student freelancers on campus.
                </p>
              </motion.div>

              {/* Feature 3: Group Buys */}
              <motion.div 
                animate={giftInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 30 }}
                transition={{ duration: 0.6, type: "spring", bounce: 0.4, delay: 0.3 }}
                className="relative flex flex-col items-center text-center p-8 rounded-[2rem] bg-primary/5 border border-primary/10 hover:border-primary/30 transition-colors overflow-hidden"
              >
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-5 relative z-10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-black text-lg mb-2 relative z-10 text-foreground">
                  Hostel Group Buys
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed relative z-10">
                  Want to buy groceries in bulk but lack the cash? Team up with other students in your hostel to split the cost and share the goods.
                </p>
              </motion.div>
            </div>
            
            <motion.p 
              animate={giftInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-primary font-bold italic pt-8"
            >
              ...you never know what's next.
            </motion.p>
          </div>
        </section>

        {/* ROADMAP SECTION (MOBILE FOCUSED) */}
        <section className="py-12 border-t border-border/20 relative">
          <div className="text-center space-y-4 mb-8">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">The Master Roadmap</h2>
            <p className="text-muted-foreground font-medium text-sm">
              String isn't just a project. It's a continent-wide mission.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="relative max-w-2xl mx-auto mb-16 rounded-[2rem] overflow-hidden border border-primary/20 shadow-2xl"
          >
            <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />
            <img 
              src={networkMap} 
              alt="String Africa Network Map" 
              className="w-full h-auto brightness-110 contrast-125 hover:scale-105 transition-transform duration-700 ease-out"
            />
          </motion.div>

          {/* Vertical Timeline */}
          <div className="relative max-w-lg mx-auto">
            {/* The Track Line */}
            <div className="absolute left-6 top-4 bottom-4 w-1 bg-gradient-to-b from-primary via-primary/50 to-transparent rounded-full" />

            <div className="space-y-12 relative z-10">
              
              {/* Step 1 */}
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                className="flex items-start gap-6"
              >
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(var(--primary),0.5)] relative">
                  <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-20" />
                  <MapPin className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="pt-2">
                  <h3 className="font-black text-xl mb-2 text-primary">The Genesis: OOU</h3>
                  <p className="text-sm text-muted-foreground">
                    We start here at Olabisi Onabanjo University (OOU). Building the infrastructure, gathering feedback from real students, and proving that localized digital trust actually works.
                  </p>
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                className="flex items-start gap-6"
              >
                <div className="w-12 h-12 rounded-full bg-background border-2 border-primary/50 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-primary/70" />
                </div>
                <div className="pt-2 opacity-80">
                  <h3 className="font-bold text-xl mb-2">Across Nigeria</h3>
                  <p className="text-sm text-muted-foreground">
                    Next, we scale. Expanding the String network to every major university and polytechnic across the nation, creating a unified student economy.
                  </p>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                className="flex items-start gap-6"
              >
                <div className="w-12 h-12 rounded-full bg-background border-2 border-border flex items-center justify-center shrink-0">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="pt-2 opacity-50">
                  <h3 className="font-bold text-xl mb-2">The Continent</h3>
                  <p className="text-sm text-muted-foreground">
                    Crossing borders. Taking the localized commerce model to campuses across Africa, empowering a new generation of digital entrepreneurs.
                  </p>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center pt-8 pb-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.05 }}
            className="inline-block"
          >
            <Link 
              to="/auth" 
              className="bg-primary text-primary-foreground font-black text-lg px-10 py-5 rounded-full flex items-center gap-3 hover:bg-primary/90 transition-all shadow-[0_0_25px_rgba(var(--primary),0.3)] active:scale-95"
            >
              Start Buying & Selling <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
        </section>

      </main>

      <footer className="text-center py-8 text-sm text-muted-foreground font-medium border-t border-border/10 relative z-10 bg-background/50 backdrop-blur-md">
        <p>&copy; {new Date().getFullYear()} String Marketplace. All rights reserved.</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
          <Link to="/terms-of-service" className="hover:text-primary transition-colors">Terms</Link>
          <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
        </div>
      </footer>
    </div>
  );
}
