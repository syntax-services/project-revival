import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MessageCircle, TrendingUp, Sparkles, ShieldCheck, ArrowRight, MapPin, Globe } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* 
        SEO & BOT METADATA 
        This content is heavily crawled. Using semantic HTML5 tags ensures AI bots
        (ChatGPT, Perplexity, Gemini) and Google understand exactly what String is.
      */}
      <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-background/80 backdrop-blur-xl border-b border-border/10 flex items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-[0_0_15px_rgba(var(--primary),0.3)] group-hover:scale-105 transition-transform">
            S
          </div>
          <span className="font-black text-lg tracking-tight">String</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link>
          <Link to="/auth" className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full hover:bg-primary/90 transition-colors shadow-sm">
            Sign In
          </Link>
        </nav>
      </header>

      <main className="pt-24 pb-20 px-6 max-w-4xl mx-auto space-y-24">
        
        {/* HERO SECTION */}
        <section className="text-center space-y-6 pt-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1]"
          >
            The Future of <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
              Campus Commerce
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium"
          >
            String is built to make buying and selling around campus incredibly simple, safe, and social. Say goodbye to scattered WhatsApp groups and hello to a personalized marketplace designed for you.
          </motion.p>
        </section>

        {/* FEATURES GRID */}
        <section className="space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">Everything you need, in one place</h2>
            <p className="text-muted-foreground font-medium">We do all the heavy lifting so you can focus on finding what you want.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Feature 1: Socialized Home Feed */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group p-6 rounded-3xl bg-muted/30 border border-border/20 hover:border-primary/30 hover:bg-muted/50 transition-colors"
            >
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Socialized Home Feed</h3>
              <p className="text-muted-foreground leading-relaxed">
                Discover goods tailored exactly to your taste. Follow your favorite campus sellers, see what's trending, and enjoy a feed that learns what you love. No more digging—just scroll and discover.
              </p>
            </motion.div>

            {/* Feature 2: Direct Communication */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="group p-6 rounded-3xl bg-muted/30 border border-border/20 hover:border-primary/30 hover:bg-muted/50 transition-colors"
            >
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageCircle className="h-6 w-6 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Seamless Communication</h3>
              <p className="text-muted-foreground leading-relaxed">
                Chat directly with businesses in real-time. Negotiate prices, ask for product details, and send voice notes without ever leaving the app or sharing your personal phone number.
              </p>
            </motion.div>

            {/* Feature 3: Boosting Sales */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="group p-6 rounded-3xl bg-muted/30 border border-border/20 hover:border-primary/30 hover:bg-muted/50 transition-colors"
            >
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Boosting Sales</h3>
              <p className="text-muted-foreground leading-relaxed">
                For sellers, getting eyes on your products has never been easier. We bring the customers right to your digital storefront, helping you move inventory faster than ever before.
              </p>
            </motion.div>

            {/* Feature 4: Escrow System (Coming Soon) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="group p-6 rounded-3xl bg-muted/30 border border-border/20 hover:border-primary/30 hover:bg-muted/50 transition-colors relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 bg-amber-500/10 text-amber-500 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider">
                Coming Soon
              </div>
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-6 w-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Zero-Risk Escrow</h3>
              <p className="text-muted-foreground leading-relaxed">
                Pay with absolute confidence. Our upcoming escrow system will hold your payment safely until you receive and approve your item. Total peace of mind for both buyers and sellers.
              </p>
            </motion.div>

          </div>
        </section>

        {/* THE STRING FLOW & VISION */}
        <section className="py-12 border-t border-border/20">
          <div className="text-center space-y-6 mb-12">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">Our Master Plan</h2>
            <p className="text-muted-foreground font-medium max-w-xl mx-auto">
              We are on a mission to connect campuses everywhere. Here is how String plans to expand and operate.
            </p>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-primary/10 via-primary to-primary/10 -translate-y-1/2 hidden md:block" />

            <div className="grid md:grid-cols-3 gap-8 relative z-10">
              
              {/* Step 1: OOU */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-background border border-border/20 p-6 rounded-3xl text-center shadow-lg relative"
              >
                <div className="h-12 w-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 font-black shadow-md">
                  1
                </div>
                <h4 className="font-bold text-lg mb-2 flex items-center justify-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> The Genesis
                </h4>
                <p className="text-sm text-muted-foreground">
                  Starting right here at <strong>Olabisi Onabanjo University (OOU)</strong>. Perfecting the formula, building trust, and proving the concept with our home community.
                </p>
              </motion.div>

              {/* Step 2: Nigeria */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-background border border-border/20 p-6 rounded-3xl text-center shadow-lg relative"
              >
                <div className="h-12 w-12 bg-muted text-foreground rounded-full flex items-center justify-center mx-auto mb-4 font-black">
                  2
                </div>
                <h4 className="font-bold text-lg mb-2 flex items-center justify-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Across Nigeria
                </h4>
                <p className="text-sm text-muted-foreground">
                  Expanding the network to cover every major university campus across Nigeria, creating a unified student economy nationwide.
                </p>
              </motion.div>

              {/* Step 3: Africa & Beyond */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="bg-background border border-border/20 p-6 rounded-3xl text-center shadow-lg relative"
              >
                <div className="h-12 w-12 bg-muted text-foreground rounded-full flex items-center justify-center mx-auto mb-4 font-black">
                  3
                </div>
                <h4 className="font-bold text-lg mb-2 flex items-center justify-center gap-2">
                  <Globe className="h-4 w-4 text-primary" /> The Continent
                </h4>
                <p className="text-sm text-muted-foreground">
                  Crossing borders into other African countries and beyond, scaling String into a global ecosystem for localized, high-trust commerce.
                </p>
              </motion.div>

            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center pt-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block"
          >
            <Link 
              to="/auth" 
              className="bg-primary text-primary-foreground font-black text-lg px-8 py-4 rounded-full flex items-center gap-2 hover:bg-primary/90 transition-all shadow-[0_0_25px_rgba(var(--primary),0.3)] hover:shadow-[0_0_35px_rgba(var(--primary),0.5)] active:scale-95"
            >
              Join String Today <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
        </section>

      </main>

      <footer className="text-center py-8 text-sm text-muted-foreground font-medium border-t border-border/10">
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
