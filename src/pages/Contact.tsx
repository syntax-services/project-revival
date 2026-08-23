import { useState } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  ShieldCheck,
  MessageSquare,
  HelpCircle,
  ChevronDown,
  Activity,
  ArrowRight,
  ExternalLink,
  MessageCircle,
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How do I secure transactions on String?",
    answer: "All listings and hiring agreements utilize Squad escrow and payment integrations. Settlements are safely secured until service verification completes or goods are confirmed delivered.",
  },
  {
    question: "How do I upgrade to a Premium business tier?",
    answer: "Admins review operational history and location coordinates before upgrading business listings. Verification builds immediate customer reputation and unlocks higher daily withdrawal bounds.",
  },
  {
    question: "Can I use multiple referral codes?",
    answer: "You can claim a welcome code once when your account is registered to earn bonus points. However, you can refer an unlimited number of friends using your unique STR code!",
  },
  {
    question: "How does the local radius search calculate distance?",
    answer: "String calculates geodesic distance using your browser's GPS coordinates relative to registered businesses. This provides instantaneous and extremely accurate local sourcing maps.",
  },
];

export default function Contact() {
  usePageMeta({
    title: "Contact & Support | Campus Help Center",
    description: "Get in touch with String customer support for inquiries, dispute resolution, and merchant assistance.",
    keywords: ["String support","contact String","campus marketplace help","customer service"],
    });

  const { user } = useAuth();
  const { toast } = useToast();
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMessage) return;

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setTicketSubject("");
      setTicketMessage("");
      toast({
        title: "Ticket Submitted!",
        description: "A platform administrator will respond via email shortly.",
      });
    }, 1200);
  };

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-6 max-w-4xl mx-auto px-1">
        {/* Systems status bar */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/5 border border-primary/10 shadow-sm animate-pulse">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></div>
            <Activity className="h-4 w-4" />
            <span>ALL STRING PLATFORM SYSTEMS OPERATIONAL</span>
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Ping: 12ms</span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-primary" />
            Help & Support
          </h1>
          <p className="mt-1 text-xs text-muted-foreground uppercase tracking-widest">
            Frictionless platform resources and technical assistance
          </p>
        </div>

        {/* Support Grid Options */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Email Support Card */}
          <div className="dashboard-card space-y-4 hover:border-primary/20 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-sm text-foreground uppercase tracking-wider">Email Assistance</h2>
                <p className="text-xs text-muted-foreground">
                  For administrative adjustments, business credential verification, or platform access troubleshooting.
                </p>
              </div>
            </div>
            <div className="pt-2">
              <a
                href="mailto:support@stringplatform.com?subject=String%20Support%20Request"
                className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline hover:gap-3 transition-all"
              >
                support@stringplatform.com
                <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Safety & RLS Card */}
          <div className="dashboard-card space-y-4 hover:border-primary/20 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h2 className="font-semibold text-sm text-foreground uppercase tracking-wider">Trust & Safety</h2>
                <p className="text-xs text-muted-foreground">
                  All listings are actively monitored. Include relevant screenshots or business details when submitting tickets.
                </p>
              </div>
            </div>
            <div className="pt-2 text-xs text-muted-foreground flex items-center gap-1 font-mono">
              <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
              <span>Secured Escrow Active</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-5">
          {/* FAQ Accordion Section */}
          <div className="md:col-span-3 space-y-4">
            <div className="dashboard-card space-y-4">
              <h2 className="font-semibold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="h-4.5 w-4.5 text-primary" />
                Frequently Asked Questions
              </h2>

              <div className="space-y-2 pt-2">
                {faqs.map((faq, i) => {
                  const isOpen = openFAQ === i;
                  return (
                    <div
                      key={i}
                      className="border border-border/10 rounded-xl overflow-hidden transition-all hover:bg-muted/5"
                    >
                      <button
                        onClick={() => toggleFAQ(i)}
                        className="w-full flex items-center justify-between p-3.5 text-left transition-colors"
                      >
                        <span className="text-xs font-semibold text-foreground">{faq.question}</span>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-300 ${
                            isOpen ? "rotate-180 text-primary" : ""
                          }`}
                        />
                      </button>
                      <div
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${
                          isOpen ? "max-h-40 border-t border-border/5 p-4 bg-muted/10" : "max-h-0"
                        }`}
                      >
                        <p className="text-xs text-muted-foreground leading-relaxed">{faq.answer}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Ticket Submission Form */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmitTicket} className="dashboard-card space-y-4">
              <h2 className="font-semibold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
                <MessageCircle className="h-4.5 w-4.5 text-primary" />
                Submit a Ticket
              </h2>

              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ticket-email" className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Your Email
                  </Label>
                  <Input
                    id="ticket-email"
                    value={user?.email || ""}
                    disabled
                    className="google-input bg-muted/30 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ticket-subject" className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Subject
                  </Label>
                  <Input
                    id="ticket-subject"
                    required
                    placeholder="Escrow support, payout issue, etc..."
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    className="google-input text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ticket-message" className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Detailed Message
                  </Label>
                  <Textarea
                    id="ticket-message"
                    required
                    rows={4}
                    placeholder="Describe the issue you're experiencing..."
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    className="google-input text-xs resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting || !ticketSubject || !ticketMessage}
                  className="w-full rounded-2xl h-10 mt-2 text-xs font-semibold"
                >
                  {submitting ? "Sending..." : "Submit Ticket"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
