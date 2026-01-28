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
import { Loader2, ArrowRight, ArrowLeft, Building2, User, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

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
  "Less than $1,000/mo", "$1,000-$5,000/mo", "$5,000-$20,000/mo",
  "$20,000-$50,000/mo", "$50,000+/mo"
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

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1: Basic Info
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2: User Type
  const [userType, setUserType] = useState<"customer" | "business" | null>(null);

  // Step 3: Business Profile
  const [businessData, setBusinessData] = useState({
    companyName: "",
    industry: "",
    companySize: "",
    yearsInOperation: "",
    businessLocation: "",
    website: "",
    businessGoals: [] as string[],
    targetCustomerType: "",
    monthlyCustomerVolume: "",
    budgetRange: "",
    marketingChannels: [] as string[],
    painPoints: [] as string[],
    productsServices: "",
    competitiveLandscape: "",
    growthStrategy: "",
    operatingRegion: "",
    internalCapacity: "",
    expectationsFromString: "",
    strategicNotes: "",
    streetAddress: "",
    areaName: "",
  });

  // Step 3: Customer Profile
  const [customerData, setCustomerData] = useState({
    ageRange: "",
    gender: "",
    location: "",
    interests: [] as string[],
    spendingHabits: "",
    preferredCategories: [] as string[],
    lifestylePreferences: [] as string[],
    serviceExpectations: "",
    painPoints: [] as string[],
    improvementWishes: "",
    purchaseFrequency: "",
    customPreferences: "",
    streetAddress: "",
    areaName: "",
  });

  useEffect(() => {
    if (profile?.onboarding_completed) {
      const redirectPath = profile.user_type === "business" ? "/business" : "/customer";
      navigate(redirectPath, { replace: true });
    }
  }, [profile, navigate]);

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
      // Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: user.id,
        full_name: fullName,
        email: user.email!,
        phone: phone || null,
        user_type: userType,
        onboarding_completed: true,
      });

      if (profileError) throw profileError;

      // Create user role
      await supabase.from("user_roles").insert({
        user_id: user.id,
        role: "user",
      });

      // Create type-specific profile
      if (userType === "business") {
        const { error: businessError } = await supabase.from("businesses").insert({
          user_id: user.id,
          company_name: businessData.companyName,
          industry: businessData.industry || null,
          company_size: businessData.companySize || null,
          years_in_operation: businessData.yearsInOperation || null,
          business_location: businessData.businessLocation || null,
          website: businessData.website || null,
          business_goals: businessData.businessGoals.length > 0 ? businessData.businessGoals : null,
          target_customer_type: businessData.targetCustomerType || null,
          monthly_customer_volume: businessData.monthlyCustomerVolume || null,
          budget_range: businessData.budgetRange || null,
          marketing_channels: businessData.marketingChannels.length > 0 ? businessData.marketingChannels : null,
          pain_points: businessData.painPoints.length > 0 ? businessData.painPoints : null,
          products_services: businessData.productsServices || null,
          competitive_landscape: businessData.competitiveLandscape || null,
          growth_strategy: businessData.growthStrategy || null,
          operating_region: businessData.operatingRegion || null,
          internal_capacity: businessData.internalCapacity || null,
          expectations_from_string: businessData.expectationsFromString || null,
          strategic_notes: businessData.strategicNotes || null,
          street_address: businessData.streetAddress || null,
          area_name: businessData.areaName || null,
          location_verified: false,
        });

        if (businessError) throw businessError;
      } else {
        const { error: customerError } = await supabase.from("customers").insert({
          user_id: user.id,
          age_range: customerData.ageRange || null,
          gender: customerData.gender || null,
          location: customerData.location || null,
          interests: customerData.interests.length > 0 ? customerData.interests : null,
          spending_habits: customerData.spendingHabits || null,
          preferred_categories: customerData.preferredCategories.length > 0 ? customerData.preferredCategories : null,
          lifestyle_preferences: customerData.lifestylePreferences.length > 0 ? customerData.lifestylePreferences : null,
          service_expectations: customerData.serviceExpectations || null,
          pain_points: customerData.painPoints.length > 0 ? customerData.painPoints : null,
          improvement_wishes: customerData.improvementWishes || null,
          purchase_frequency: customerData.purchaseFrequency || null,
          custom_preferences: customerData.customPreferences || null,
          street_address: customerData.streetAddress || null,
          area_name: customerData.areaName || null,
          location_verified: false,
        });

        if (customerError) throw customerError;
      }

      // Create location verification request
      const streetAddress = userType === "business" ? businessData.streetAddress : customerData.streetAddress;
      const areaName = userType === "business" ? businessData.areaName : customerData.areaName;
      
      if (streetAddress) {
        await supabase.from("location_requests").insert({
          user_id: user.id,
          user_type: userType,
          street_address: streetAddress,
          area_name: areaName || null,
        });
      }

      await refreshProfile();

      toast({
        title: "Welcome to String!",
        description: "Your account has been set up successfully.",
      });

      const redirectPath = userType === "business" ? "/business" : "/customer";
      navigate(redirectPath, { replace: true });
    } catch (error: any) {
      console.error("Onboarding error:", error);
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: error.message || "Please try again.",
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
