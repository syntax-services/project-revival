import { usePageMeta } from "@/hooks/usePageMeta";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCcw, ShieldCheck, Clock, MapPin } from "lucide-react";
import { motion } from "framer-motion";

export default function RefundPolicy() {
  usePageMeta({
    title: "Return & Refund Policy | String",
    description: "Our policies for returns, refunds, and buyer protection.",
  });

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-4xl mx-auto px-6 pt-12">
        <Link to="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl md:text-5xl font-black mb-6">Return & Refund Policy</h1>
          <p className="text-muted-foreground text-lg mb-12">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <div className="space-y-12 prose prose-invert max-w-none">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2"><RefreshCcw className="text-primary" /> 1. Return Window & Eligibility</h2>
              <p>We want you to be completely satisfied with your purchase on String. As a marketplace facilitating transactions between campus businesses and students, our standard return window is <strong>7 days from the date of delivery</strong>.</p>
              <p>To be eligible for a return, the item must be:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Unused and in the same condition that you received it.</li>
                <li>In its original packaging, with all tags and seals intact.</li>
                <li>Accompanied by the original receipt or proof of purchase.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="text-primary" /> 2. Non-Returnable Items</h2>
              <p>For health, safety, and hygiene reasons, the following items cannot be returned:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Perishable goods (e.g., food, groceries, custom-made cakes).</li>
                <li>Intimate or sanitary goods, hazardous materials, or flammable liquids/gases.</li>
                <li>Digital downloads, software, and gift cards.</li>
                <li>Custom-made or personalized items.</li>
                <li>Services that have already been rendered or commenced.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2"><Clock className="text-primary" /> 3. Refund Process</h2>
              <p>Once your return is received and inspected by the merchant, we will notify you of the approval or rejection of your refund.</p>
              <p>If approved, your refund will be processed, and a credit will automatically be applied to your original method of payment within <strong>3-5 business days</strong>. Please note that shipping costs are non-refundable. If you receive a refund, the cost of return shipping will be deducted from your refund unless the item was defective.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2"><MapPin className="text-primary" /> 4. Shipping Returns</h2>
              <p>To return your product, you should contact the merchant directly via the String messaging system to arrange a drop-off or pickup location on campus.</p>
              <p>You will be responsible for paying for your own shipping costs for returning your item. We recommend using a trackable shipping service for high-value items, as we cannot guarantee that the merchant will receive your returned item.</p>
            </section>

            <section className="space-y-4 bg-muted/30 p-6 rounded-2xl border border-border/10">
              <h2 className="text-xl font-bold mb-2">Need Help?</h2>
              <p>If you have any questions concerning our return policy, or if you are unable to resolve a dispute with a merchant, please contact our support team:</p>
              <ul className="mt-2 text-primary font-medium">
                <li>Email: support@stringcampus.com</li>
                <li>Phone: +234 812 345 6789</li>
                <li>Address: Olabisi Onabanjo University (OOU), Ago-Iwoye, Ogun State, Nigeria</li>
              </ul>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
