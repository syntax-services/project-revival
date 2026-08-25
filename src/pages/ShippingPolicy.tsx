import { usePageMeta } from "@/hooks/usePageMeta";
import { Link } from "react-router-dom";
import { ArrowLeft, Truck, Package, Clock, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export default function ShippingPolicy() {
  usePageMeta({
    title: "Shipping & Delivery Policy | String",
    description: "Information regarding shipping, delivery timelines, and campus pickup.",
  });

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-4xl mx-auto px-6 pt-12">
        <Link to="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl md:text-5xl font-black mb-6">Shipping & Delivery Policy</h1>
          <p className="text-muted-foreground text-lg mb-12">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

          <div className="space-y-12 prose prose-invert max-w-none">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2"><Truck className="text-primary" /> 1. Delivery Methods</h2>
              <p>String operates primarily as a hyper-local campus marketplace. We offer two main methods for receiving your orders:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Campus Delivery:</strong> Merchants deliver directly to your hostel, department, or specified campus location. Delivery fees are set by the individual merchant and are displayed at checkout.</li>
                <li><strong>Local Pickup:</strong> You can choose to pick up your order directly from the merchant's location or a designated meetup spot on campus (e.g., PS, Fine Arts, specific hostels). This option is usually free.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2"><Clock className="text-primary" /> 2. Processing & Delivery Times</h2>
              <p>All orders are processed within <strong>24 to 48 hours</strong> (excluding weekends and holidays) after receiving your order confirmation email. You will receive another notification when your order has shipped or is ready for pickup.</p>
              <p>Estimated delivery times:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Food & Groceries:</strong> Same day (usually within 1-2 hours).</li>
                <li><strong>Fashion & Electronics:</strong> Same day to 1 business day.</li>
                <li><strong>Custom Services/Items:</strong> As agreed upon with the merchant (typically 3-5 business days).</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2"><Package className="text-primary" /> 3. Shipping Rates</h2>
              <p>Shipping charges for your order will be calculated and displayed at checkout. Because our merchants manage their own logistics, shipping rates may vary depending on the merchant's location and your delivery address within or around the campus.</p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2"><ShieldAlert className="text-primary" /> 4. Missing or Delayed Orders</h2>
              <p>If you haven't received your order within the estimated delivery time, please first contact the merchant directly via the String messaging system.</p>
              <p>If the merchant is unresponsive or you need further assistance, contact our support team at <strong>support@stringcampus.com</strong> with your name and order number, and we will investigate it for you.</p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
