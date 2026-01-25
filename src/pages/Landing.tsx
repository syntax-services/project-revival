import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowRight,
  Building2,
  Users,
  Zap,
  Shield,
  BarChart3,
  Target,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Smart Matching",
    description:
      "Connect with the right customers or businesses based on deep profiling and preferences.",
  },
  {
    icon: BarChart3,
    title: "Data-Driven Insights",
    description:
      "Make informed decisions with comprehensive analytics and customer behavior data.",
  },
  {
    icon: Target,
    title: "Personalized Delivery",
    description:
      "Deliver tailored experiences that increase engagement and satisfaction.",
  },
  {
    icon: Zap,
    title: "Efficient Workflows",
    description:
      "Streamline your operations with automated processes and smart tools.",
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description:
      "Enterprise-grade security to protect your data and customer information.",
  },
  {
    icon: Building2,
    title: "Scalable Platform",
    description:
      "Grow with confidence using infrastructure designed for businesses of all sizes.",
  },
];

export default function Landing() {
  const { user, profile } = useAuth();

  const getDashboardLink = () => {
    if (!user) return "/auth";
    if (!profile?.onboarding_completed) return "/onboarding";
    return profile?.user_type === "business" ? "/business" : "/customer";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">S</span>
            </div>
            <span className="font-semibold text-foreground">String</span>
          </Link>
          <nav className="flex items-center gap-4">
            {user ? (
              <Button asChild>
                <Link to={getDashboardLink()}>
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/auth?mode=login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth?mode=signup">Get Started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-16 md:py-24 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Connect businesses and customers{" "}
            <span className="text-primary">intelligently</span>
          </h1>
          <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
            String is the platform that helps businesses reach their ideal customers
            and helps customers discover personalized services. Built for scale,
            designed for growth.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link to="/auth?mode=signup">
                Start for Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/auth?mode=signup&type=business">For Businesses</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-border bg-surface py-16 md:py-24">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Everything you need to succeed
            </h2>
            <p className="text-muted-foreground">
              A comprehensive platform with tools designed to connect, engage, and grow.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="dashboard-card group"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                    <Icon className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground">
            Ready to get started?
          </h2>
          <p className="mb-8 text-muted-foreground">
            Join thousands of businesses and customers already using String to connect
            and grow together.
          </p>
          <Button size="lg" asChild>
            <Link to="/auth?mode=signup">
              Create your account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">S</span>
            </div>
            <span className="text-sm text-muted-foreground">
              © 2025 String. All rights reserved.
            </span>
          </div>
          <nav className="flex gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Terms
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
