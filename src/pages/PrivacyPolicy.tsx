import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicy() {
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
                        <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-4xl font-bold text-foreground tracking-tight">Privacy Policy</h1>
                </div>

                <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-muted-foreground leading-relaxed">
                    <p className="text-lg">
                        Last Updated: February 20, 2026
                    </p>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">1. Introduction</h2>
                        <p>
                            String Platform ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">2. Information We Collect</h2>
                        <p>
                            We collect information that you provide directly to us when you create an account, complete onboarding, or interact with businesses on our platform. This includes:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Personal identifiers (name, email address, phone number).</li>
                            <li>Location data (GPS coordinates, street address) for delivery and discovery services.</li>
                            <li>Business information for merchants (company name, industry, financial data).</li>
                            <li>Transaction history and communication logs.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">3. How We Use Your Information</h2>
                        <p>
                            We use the collected data to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Provide, maintain, and improve our services.</li>
                            <li>Facilitate smart matching between customers and businesses.</li>
                            <li>Ensure accurate deliveries through verified location data.</li>
                            <li>Process payments and prevent fraud.</li>
                            <li>Communicate with you about updates or security alerts.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">4. Data Protection (NDPR Compliance)</h2>
                        <p>
                            In accordance with the Nigeria Data Protection Regulation (NDPR), we implement strict security measures to protect your data. We do not sell your personal information to third parties. We only share data with service providers (like payment processors) necessary to fulfill our service obligations.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">5. Your Rights</h2>
                        <p>
                            You have the right to access, correct, or delete your personal data. You can manage your profile settings within the app or contact our support team for assistance.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-semibold text-foreground">6. Contact Us</h2>
                        <p>
                            If you have any questions about this Privacy Policy, please contact us at support@stringplatform.com.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
