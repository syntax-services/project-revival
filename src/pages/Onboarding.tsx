import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, ArrowLeft, Building2, User, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Json } from "@/integrations/supabase/types";
import { z } from "zod";

type UserType = "customer" | "business";

interface BusinessFormData {
  companyName: string;
  industry: string;
  companySize: string;
  yearsInOperation: string;
  businessLocation: string;
  website: string;
  businessGoals: string[];
  targetCustomerType: string;
  monthlyCustomerVolume: string;
  budgetRange: string;
  marketingChannels: string[];
  painPoints: string[];
  productsServices: string;
  competitiveLandscape: string;
  growthStrategy: string;
  operatingRegion: string;
  internalCapacity: string;
  expectationsFromString: string;
  strategicNotes: string;
  streetAddress: string;
  areaName: string;
  businessType: "goods" | "services" | "both";
}

interface CustomerFormData {
  ageRange: string;
  gender: string;
  location: string;
  interests: string[];
  spendingHabits: string;
  preferredCategories: string[];
  lifestylePreferences: string[];
  serviceExpectations: string;
  painPoints: string[];
  improvementWishes: string;
  purchaseFrequency: string;
  customPreferences: string;
  streetAddress: string;
  areaName: string;
}

interface OnboardingDraftPayload {
  fullName: string;
  phone: string;
  businessData: BusinessFormData;
  customerData: CustomerFormData;
}

interface OnboardingCompletionResult {
  redirect_path?: string;
  success?: boolean;
  user_type?: UserType;
}

const basicInfoSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
});

// Step definitions
const steps = [
  { id: 1, title: "Basic Info" },
  { id: 2, title: "Account Type" },
  { id: 3, title: "Profile Details" },
  { id: 4, title: "Location" },
];

// Options
const industryOptions = [
  "Technology", "Healthcare", "Finance", "Retail", "Manufacturing",
  "Education", "Real Estate", "Food & Beverage", "Entertainment", "Other"
];

const companySizeOptions = [
  "1-10 employees", "11-50 employees", "51-200 employees",
  "201-500 employees", "500+ employees"
];

const yearsOptions = [
  "Less than 1 year", "1-3 years", "3-5 years", "5-10 years", "10+ years"
];

const budgetOptions = [
  "Less than ₦50,000/mo", "₦50,000-₦250,000/mo", "₦250,000-₦1,000,000/mo",
  "₦1,000,000-₦5,000,000/mo", "₦5,000,000+/mo"
];

const marketingChannels = [
  "Social Media", "Email Marketing", "Content Marketing", "SEO",
  "PPC Advertising", "Influencer Marketing", "Events", "Referrals", "Other"
];

const ageRangeOptions = [
  "18-24", "25-34", "35-44", "45-54", "55-64", "65+"
];

const purchaseFrequencyOptions = [
  "Daily", "Weekly", "Monthly", "Quarterly", "Rarely"
];

const interestSuggestions = [
  "Technology", "Fashion", "Health & Fitness", "Travel", "Food & Dining",
  "Entertainment", "Sports", "Home & Garden", "Arts & Culture", "Finance",
  "Education", "Beauty", "Automotive", "Gaming", "Music"
];

const categoryOptions = [
  "Restaurants", "Shopping", "Services", "Entertainment", "Health & Beauty",
  "Home Services", "Professional Services", "Fitness", "Travel", "Technology"
];

const defaultBusinessData: BusinessFormData = {
  companyName: "",
  industry: "",
  companySize: "",
  yearsInOperation: "",
  businessLocation: "",
  website: "",
  businessGoals: [],
  targetCustomerType: "",
  monthlyCustomerVolume: "",
  budgetRange: "",
  marketingChannels: [],
  painPoints: [],
  productsServices: "",
  competitiveLandscape: "",
  growthStrategy: "",
  operatingRegion: "",
  internalCapacity: "",
  expectationsFromString: "",
  strategicNotes: "",
  streetAddress: "",
  areaName: "",
  businessType: "both",
};

const defaultCustomerData: CustomerFormData = {
  ageRange: "",
  gender: "",
  location: "",
  interests: [],
  spendingHabits: "",
  preferredCategories: [],
  lifestylePreferences: [],
  serviceExpectations: "",
  painPoints: [],
  improvementWishes: "",
  purchaseFrequency: "",
  customPreferences: "",
  streetAddress: "",
  areaName: "",
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export default function Onboarding() {
  const { user, profile, refreshProfile, dashboardPath } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1: Basic Info
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2: User Type
  const [userType, setUserType] = useState<UserType | null>(null);

  // Step 3: Business Profile
  const [businessData, setBusinessData] = useState<BusinessFormData>(defaultBusinessData);

  // Step 3: Customer Profile
  const [customerData, setCustomerData] = useState<CustomerFormData>(defaultCustomerData);

  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate(dashboardPath, { replace: true });
    }
  }, [dashboardPath, navigate, profile]);

  useEffect(() => {
    const loadDraft = async () => {
      if (!user || profile?.onboarding_completed) {
        setDraftHydrated(true);
        return;
      }

      try {
        const { data: draftRecord, error } = await supabase
          .from("onboarding_drafts")
          .select("current_step, selected_user_type, draft")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (!draftRecord) {
          if (profile?.full_name) {
            setFullName(profile.full_name);
          }

          if (profile?.phone) {
            setPhone(profile.phone);
          }

          if (profile?.user_type === "business" || profile?.user_type === "customer") {
            setUserType(profile.user_type);
          }

          setDraftHydrated(true);
          return;
        }

        const draft = (draftRecord.draft ?? {}) as Record<string, unknown>;
        const draftBusinessData = draft.businessData as Partial<BusinessFormData> | undefined;
        const draftCustomerData = draft.customerData as Partial<CustomerFormData> | undefined;

        if (typeof draft.fullName === "string") {
          setFullName(draft.fullName);
        }

        if (typeof draft.phone === "string") {
          setPhone(draft.phone);
        }

        if (draftRecord.selected_user_type === "business" || draftRecord.selected_user_type === "customer") {
          setUserType(draftRecord.selected_user_type);
        }

        if (draftBusinessData) {
          setBusinessData({
            ...defaultBusinessData,
            ...draftBusinessData,
            businessGoals: isStringArray(draftBusinessData.businessGoals) ? draftBusinessData.businessGoals : defaultBusinessData.businessGoals,
            marketingChannels: isStringArray(draftBusinessData.marketingChannels) ? draftBusinessData.marketingChannels : defaultBusinessData.marketingChannels,
            painPoints: isStringArray(draftBusinessData.painPoints) ? draftBusinessData.painPoints : defaultBusinessData.painPoints,
            businessType:
              draftBusinessData.businessType === "goods" ||
              draftBusinessData.businessType === "services" ||
              draftBusinessData.businessType === "both"
                ? draftBusinessData.businessType
                : defaultBusinessData.businessType,
          });
        }

        if (draftCustomerData) {
          setCustomerData({
            ...defaultCustomerData,
            ...draftCustomerData,
            interests: isStringArray(draftCustomerData.interests) ? draftCustomerData.interests : defaultCustomerData.interests,
            preferredCategories: isStringArray(draftCustomerData.preferredCategories)
              ? draftCustomerData.preferredCategories
              : defaultCustomerData.preferredCategories,
            lifestylePreferences: isStringArray(draftCustomerData.lifestylePreferences)
              ? draftCustomerData.lifestylePreferences
              : defaultCustomerData.lifestylePreferences,
            painPoints: isStringArray(draftCustomerData.painPoints) ? draftCustomerData.painPoints : defaultCustomerData.painPoints,
          });
        }

        if (
          typeof draftRecord.current_step === "number" &&
          draftRecord.current_step >= 1 &&
          draftRecord.current_step <= steps.length
        ) {
          setCurrentStep(draftRecord.current_step);
        }
      } catch (error) {
        console.error("Failed to load onboarding draft:", error);
      } finally {
        setDraftHydrated(true);
      }
    };

    void loadDraft();
  }, [profile, profile?.onboarding_completed, user]);

  useEffect(() => {
    if (!user || profile?.onboarding_completed || !draftHydrated) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const payload: OnboardingDraftPayload = {
        fullName,
        phone,
        businessData,
        customerData,
      };

      const persistDraft = async () => {
        const { error } = await supabase.rpc("save_onboarding_draft", {
          p_current_step: currentStep,
          p_selected_user_type: userType,
          p_draft: payload as unknown as Json,
        });

        if (error) {
          console.error("Failed to save onboarding draft:", error);
        }
      };

      void persistDraft();
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [
    businessData,
    currentStep,
    customerData,
    draftHydrated,
    fullName,
    phone,
    profile?.onboarding_completed,
    user,
    userType,
  ]);

  const validateStep = () => {
    setErrors({});
    if (currentStep === 1) {
      try {
        basicInfoSchema.parse({ fullName, phone });
        return true;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors: Record<string, string> = {};
          error.errors.forEach((err) => {
            fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
        }
        return false;
      }
    }
    if (currentStep === 2) {
      if (!userType) {
        setErrors({ userType: "Please select an account type" });
        return false;
      }
      return true;
    }
    if (currentStep === 3) {
      if (userType === "business" && !businessData.companyName) {
        setErrors({ companyName: "Company name is required" });
        return false;
      }
      return true;
    }
    if (currentStep === 4) {
      // Location is mandatory
      const address = userType === "business" ? businessData.streetAddress : customerData.streetAddress;
      if (!address?.trim()) {
        setErrors({ streetAddress: "Location is required for accurate delivery and discovery" });
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep() || !user || !userType) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc("complete_onboarding_setup", {
        p_full_name: fullName.trim(),
        p_phone: phone.trim() || null,
        p_user_type: userType,
        p_business_data: userType === "business" ? (businessData as unknown as Json) : null,
        p_customer_data: userType === "customer" ? (customerData as unknown as Json) : null,
      });

      if (error) {
        throw error;
      }

      const completionResult = (data ?? {}) as OnboardingCompletionResult;

      if (!completionResult.success) {
        throw new Error("Unable to complete onboarding right now. Please try again.");
      }

      await refreshProfile();

      toast({
        title: "Welcome to String!",
        description: "Your account has been set up successfully.",
      });

      const redirectPath =
        completionResult.redirect_path || (userType === "business" ? "/business" : "/customer");
      navigate(redirectPath, { replace: true });
    } catch (error: unknown) {
      console.error("Onboarding error:", error);
      const message = error instanceof Error ? error.message : "Please try again.";
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="mb-8 flex items-center justify-center gap-2">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={cn(
              currentStep > step.id
                ? "step-indicator-completed"
                : currentStep === step.id
                  ? "step-indicator-active"
                  : "step-indicator-pending"
            )}
          >
            {currentStep > step.id ? (
              <Check className="h-4 w-4" />
            ) : (
              step.id
            )}
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "mx-2 h-0.5 w-8 sm:w-12",
                currentStep > step.id ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">
          Let's get to know you
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us a bit about yourself
        </p>
      </div>

      <div className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          {errors.fullName && (
            <p className="text-sm text-destructive">{errors.fullName}</p>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Info className="h-3 w-3" /> Enter your legal or known name (e.g., John Doe).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number (Optional)</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Info className="h-3 w-3" /> We'll use this primarily for delivery and contact.
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">
          Choose your account type
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select how you'll use String
        </p>
      </div>

      <div className="grid gap-4 pt-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setUserType("customer")}
          className={cn(
            "flex flex-col items-center gap-3 rounded-lg border-2 p-6 text-center transition-all",
            userType === "customer"
              ? "border-primary bg-accent"
              : "border-border hover:border-primary/50"
          )}
        >
          <div className="rounded-full bg-primary/10 p-3">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Customer</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Discover businesses and services tailored to your needs
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setUserType("business")}
          className={cn(
            "flex flex-col items-center gap-3 rounded-lg border-2 p-6 text-center transition-all",
            userType === "business"
              ? "border-primary bg-accent"
              : "border-border hover:border-primary/50"
          )}
        >
          <div className="rounded-full bg-primary/10 p-3">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Business</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Reach your ideal customers and grow your business
            </p>
          </div>
        </button>
      </div>

      {errors.userType && (
        <p className="text-center text-sm text-destructive">{errors.userType}</p>
      )}
    </div>
  );

  const renderBusinessStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">
          Tell us about your business
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Help us understand your business better
        </p>
      </div>

      <div className="max-h-[50vh] space-y-4 overflow-y-auto px-1 pt-2">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            placeholder="Acme Inc."
            value={businessData.companyName}
            onChange={(e) =>
              setBusinessData({ ...businessData, companyName: e.target.value })
            }
          />
          {errors.companyName && (
            <p className="text-sm text-destructive">{errors.companyName}</p>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Info className="h-3 w-3" /> The official, public name of your business.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Industry</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={businessData.industry}
              onChange={(e) =>
                setBusinessData({ ...businessData, industry: e.target.value })
              }
            >
              <option value="">Select industry</option>
              {industryOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Company Size</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={businessData.companySize}
              onChange={(e) =>
                setBusinessData({ ...businessData, companySize: e.target.value })
              }
            >
              <option value="">Select size</option>
              {companySizeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Years in Operation</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={businessData.yearsInOperation}
              onChange={(e) =>
                setBusinessData({ ...businessData, yearsInOperation: e.target.value })
              }
            >
              <option value="">Select years</option>
              {yearsOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Budget Range</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={businessData.budgetRange}
              onChange={(e) =>
                setBusinessData({ ...businessData, budgetRange: e.target.value })
              }
            >
              <option value="">Select budget</option>
              {budgetOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Business Location</Label>
          <Input
            placeholder="City, Country"
            value={businessData.businessLocation}
            onChange={(e) =>
              setBusinessData({ ...businessData, businessLocation: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Website</Label>
          <Input
            type="url"
            placeholder="https://example.com"
            value={businessData.website}
            onChange={(e) =>
              setBusinessData({ ...businessData, website: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Marketing Channels Used</Label>
          <TagInput
            value={businessData.marketingChannels}
            onChange={(tags) =>
              setBusinessData({ ...businessData, marketingChannels: tags })
            }
            suggestions={marketingChannels}
            placeholder="Add marketing channels..."
          />
        </div>

        <div className="space-y-2">
          <Label>Business Goals</Label>
          <TagInput
            value={businessData.businessGoals}
            onChange={(tags) =>
              setBusinessData({ ...businessData, businessGoals: tags })
            }
            placeholder="Add your business goals..."
          />
        </div>

        <div className="space-y-2">
          <Label>Key Pain Points</Label>
          <TagInput
            value={businessData.painPoints}
            onChange={(tags) =>
              setBusinessData({ ...businessData, painPoints: tags })
            }
            placeholder="Add pain points..."
          />
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Info className="h-3 w-3" /> Challenges your business is currently facing.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Products/Services Offered</Label>
          <Textarea
            placeholder="Describe your products or services..."
            value={businessData.productsServices}
            onChange={(e) =>
              setBusinessData({ ...businessData, productsServices: e.target.value })
            }
          />
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Info className="h-3 w-3" /> List exactly what you sell or offer. Example: 'Pastries, Wedding Cakes, Delivery'.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Business Type *</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={businessData.businessType}
            onChange={(e) =>
              setBusinessData({ ...businessData, businessType: e.target.value as "goods" | "services" | "both" })
            }
          >
            <option value="goods">Goods (Products)</option>
            <option value="services">Services</option>
            <option value="both">Both Goods & Services</option>
          </select>
          <p className="text-xs text-muted-foreground">This helps us categorize your business correctly in search results</p>
        </div>

        <div className="space-y-2">
          <Label>Expectations from String</Label>
          <Textarea
            placeholder="What do you hope to achieve with String?"
            value={businessData.expectationsFromString}
            onChange={(e) =>
              setBusinessData({ ...businessData, expectationsFromString: e.target.value })
            }
          />
        </div>
      </div>
    </div>
  );

  const renderCustomerStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">
          Tell us about yourself
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Help us personalize your experience
        </p>
      </div>

      <div className="max-h-[50vh] space-y-4 overflow-y-auto px-1 pt-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Age Range</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={customerData.ageRange}
              onChange={(e) =>
                setCustomerData({ ...customerData, ageRange: e.target.value })
              }
            >
              <option value="">Select age range</option>
              {ageRangeOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Gender (Optional)</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={customerData.gender}
              onChange={(e) =>
                setCustomerData({ ...customerData, gender: e.target.value })
              }
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Location</Label>
          <Input
            placeholder="City, Country"
            value={customerData.location}
            onChange={(e) =>
              setCustomerData({ ...customerData, location: e.target.value })
            }
          />
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Info className="h-3 w-3" /> Enter your current city and country so we can match you with local businesses.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Interests</Label>
          <TagInput
            value={customerData.interests}
            onChange={(tags) =>
              setCustomerData({ ...customerData, interests: tags })
            }
            suggestions={interestSuggestions}
            placeholder="Add your interests..."
          />
        </div>

        <div className="space-y-2">
          <Label>Preferred Business Categories</Label>
          <TagInput
            value={customerData.preferredCategories}
            onChange={(tags) =>
              setCustomerData({ ...customerData, preferredCategories: tags })
            }
            suggestions={categoryOptions}
            placeholder="Add preferred categories..."
          />
        </div>

        <div className="space-y-2">
          <Label>Purchase Frequency</Label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={customerData.purchaseFrequency}
            onChange={(e) =>
              setCustomerData({ ...customerData, purchaseFrequency: e.target.value })
            }
          >
            <option value="">Select frequency</option>
            {purchaseFrequencyOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Info className="h-3 w-3" /> How often do you buy these kinds of services or goods?
          </p>
        </div>

        <div className="space-y-2">
          <Label>What do you want String to improve?</Label>
          <Textarea
            placeholder="Tell us what matters most to you..."
            value={customerData.improvementWishes}
            onChange={(e) =>
              setCustomerData({ ...customerData, improvementWishes: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Service Expectations</Label>
          <Textarea
            placeholder="What do you expect from businesses?"
            value={customerData.serviceExpectations}
            onChange={(e) =>
              setCustomerData({ ...customerData, serviceExpectations: e.target.value })
            }
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => {
    if (userType === "business") return renderBusinessStep3();
    return renderCustomerStep3();
  };

  const renderStep4 = () => {
    const data = userType === "business" ? businessData : customerData;
    const setData = userType === "business"
      ? (updates: Partial<typeof businessData>) => setBusinessData({ ...businessData, ...updates })
      : (updates: Partial<typeof customerData>) => setCustomerData({ ...customerData, ...updates });

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">
            Your Location
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {userType === "business"
              ? "Enter your business address for customers to find you"
              : "Enter your location for accurate delivery and nearby businesses"}
          </p>
        </div>

        <div className="space-y-4 pt-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm text-muted-foreground">
              📍 <strong>Important:</strong> Enter your exact street address including landmarks.
              Our team will verify it on Google Maps for accurate delivery services.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="streetAddress">Street Address *</Label>
            <Textarea
              id="streetAddress"
              placeholder={userType === "business"
                ? "E.g., Shop 5, Behind GTBank, OOU Main Gate Road, Ago-Iwoye"
                : "E.g., Block C, Room 215, Hall 3, OOU Campus, Ago-Iwoye"}
              value={data.streetAddress}
              onChange={(e) => setData({ streetAddress: e.target.value })}
              rows={3}
            />
            {errors.streetAddress && (
              <p className="text-sm text-destructive">{errors.streetAddress}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Include building number, floor, landmarks, and street name
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="areaName">Area / Neighborhood</Label>
            <Input
              id="areaName"
              placeholder="E.g., Campus Area, Town, Off-Campus"
              value={data.areaName}
              onChange={(e) => setData({ areaName: e.target.value })}
            />
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              🔒 Your location will be verified by our team within 24 hours.
              This ensures accurate delivery and helps customers find nearby businesses.
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (!draftHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading your onboarding progress...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-lg animate-fade-in">
          {renderStepIndicator()}

          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}

            <div className="mt-8 flex justify-between gap-4">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={loading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              {currentStep < steps.length ? (
                <Button type="button" onClick={handleNext}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
