import { Link } from "react-router-dom";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container flex h-14 items-center">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="container py-12">
        <div className="mx-auto max-w-2xl space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-foreground">Contact String</h1>
            <p className="text-muted-foreground">
              Reach out for support, onboarding help, payment issues, or account access
              questions.
            </p>
          </div>

          <div className="dashboard-card space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-3">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="font-medium text-foreground">Email Support</h2>
                <p className="text-sm text-muted-foreground">
                  For account recovery, admin access, or platform support.
                </p>
                <a
                  href="mailto:support@stringplatform.com"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  support@stringplatform.com
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-muted p-3">
                <ShieldCheck className="h-5 w-5 text-foreground" />
              </div>
              <div className="space-y-1">
                <h2 className="font-medium text-foreground">Security and Access</h2>
                <p className="text-sm text-muted-foreground">
                  Include the email address on your account and a short description of the
                  issue so support can respond faster.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Button asChild>
                <a href="mailto:support@stringplatform.com?subject=String%20Support%20Request">
                  Email Support
                </a>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
