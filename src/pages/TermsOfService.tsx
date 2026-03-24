import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsOfService() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background py-16 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>

                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-4xl font-bold text-foreground tracking-tight">Terms of Service</h1>
                </div>

                <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-muted-foreground leading-relaxed">
                    <p className="text-lg">
                        Last Updated: March 24, 2026
                    </p>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
                        <p>
                            By accessing or using the String Platform, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use our services.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">2. Description of Service</h2>
                        <p>
                            String is a platform that connects local businesses with customers and supports discovery, communication, payments, and transaction coordination. For qualifying transactions, String may serve as the marketplace intermediary and escrow-style payment layer through approved payment partners until applicable release conditions, verification checks, or delivery milestones are satisfied.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">3. User Conduct</h2>
                        <p>
                            Users agree not to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Provide false information during onboarding or verification.</li>
                            <li>Use the platform for any illegal activities or unauthorized purposes.</li>
                            <li>Interfere with the operation of the platform or other users' enjoyment.</li>
                            <li>Attempt to circumvent payment systems or platform fees.</li>
                            <li>Move transactions off-platform to avoid platform review, escrow flow, or enforcement checks.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">4. Merchant Obligations</h2>
                        <p>
                            Businesses on the platform agree to provide accurate descriptions of products/services, maintain high-quality fulfillment standards, and comply with all local laws and regulations regarding their business operations.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">5. Payments and Fees</h2>
                        <p>
                            Payments are processed through our partner Paystack. String may charge service fees or commissions on transactions as disclosed at the point of sale. Where String is facilitating an escrow-style flow, payouts, releases, reversals, reviews, or holds may be delayed while we complete fraud checks, delivery confirmation, dispute review, compliance review, or other safety processes. All fees are non-refundable unless otherwise required by law.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">6. Platform Safety and Enforcement</h2>
                        <p>
                            We reserve the right to immediately suspend, restrict, close, or terminate any account, listing, payout, order, or transaction at any time if we detect suspicious conduct, fraud risk, abusive behavior, impersonation, payment manipulation, policy violations, or any activity that could expose users, partners, or the platform to harm. We may request additional information or verification before restoring access.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">7. Limitation of Liability</h2>
                        <p>
                            String Platform shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use our services or for the cost of procurement of substitute goods and services.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">8. Governing Law</h2>
                        <p>
                            These terms are governed by the laws of the Federal Republic of Nigeria.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
