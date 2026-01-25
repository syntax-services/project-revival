import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserLocation } from "@/hooks/useLocation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Building2,
  MapPin,
  Save,
  LogOut,
  Palette,
  Upload,
  Image,
} from "lucide-react";

interface BusinessData {
  id: string;
  company_name: string;
  industry: string | null;
  business_location: string | null;
  products_services: string | null;
  website: string | null;
  cover_image_url: string | null;
}

export default function BusinessSettings() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { location, loading: locationLoading, requestLocation } = useUserLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone || "");
    }
  }, [profile]);

  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("businesses")
        .select("id, company_name, industry, business_location, products_services, website, cover_image_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setBusinessData(data);
      }
    };

    fetchBusinessData();
  }, [user]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessData) return;

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `covers/${businessData.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("business-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("business-images")
        .getPublicUrl(filePath);

      await supabase
        .from("businesses")
        .update({ cover_image_url: publicUrl })
        .eq("id", businessData.id);

      setBusinessData((prev) => prev ? { ...prev, cover_image_url: publicUrl } : null);
      
      toast({
        title: "Cover uploaded",
        description: "Your cover image has been updated.",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !businessData) return;
    setSaving(true);

    try {
      // Update profile
      await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone || null,
        })
        .eq("user_id", user.id);

      // Update business data
      await supabase
        .from("businesses")
        .update({
          company_name: businessData.company_name,
          industry: businessData.industry,
          business_location: businessData.business_location,
          products_services: businessData.products_services,
          website: businessData.website,
        })
        .eq("id", businessData.id);

      await refreshProfile();
      
      toast({
        title: "Settings saved",
        description: "Your business profile has been updated.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!businessData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your business profile and preferences
          </p>
        </div>

        {/* Cover Image */}
        <div className="dashboard-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
              <Image className="h-5 w-5 text-accent-foreground" />
            </div>
            <h2 className="font-medium text-foreground">Cover Image</h2>
          </div>

          <div className="relative h-40 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
            {businessData.cover_image_url ? (
              <img
                src={businessData.cover_image_url}
                alt="Business cover"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-4xl font-bold text-primary/30">
                  {businessData.company_name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="google-input-button"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Uploading..." : "Upload Cover Image"}
          </Button>
        </div>

        {/* Business Profile */}
        <div className="dashboard-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
              <Building2 className="h-5 w-5 text-accent-foreground" />
            </div>
            <h2 className="font-medium text-foreground">Business Details</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={businessData.company_name}
                onChange={(e) =>
                  setBusinessData((prev) => prev ? { ...prev, company_name: e.target.value } : null)
                }
                className="google-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={businessData.industry || ""}
                onChange={(e) =>
                  setBusinessData((prev) => prev ? { ...prev, industry: e.target.value } : null)
                }
                className="google-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessLocation">Location</Label>
              <Input
                id="businessLocation"
                value={businessData.business_location || ""}
                onChange={(e) =>
                  setBusinessData((prev) => prev ? { ...prev, business_location: e.target.value } : null)
                }
                className="google-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={businessData.website || ""}
                onChange={(e) =>
                  setBusinessData((prev) => prev ? { ...prev, website: e.target.value } : null)
                }
                placeholder="https://"
                className="google-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="products">Products / Services</Label>
            <Textarea
              id="products"
              value={businessData.products_services || ""}
              onChange={(e) =>
                setBusinessData((prev) => prev ? { ...prev, products_services: e.target.value } : null)
              }
              placeholder="Describe what you offer..."
              className="google-input min-h-[100px]"
            />
          </div>
        </div>

        {/* Contact Info */}
        <div className="dashboard-card space-y-4">
          <h2 className="font-medium text-foreground">Contact Information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Contact Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="google-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile?.email || ""}
                disabled
                className="google-input bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="google-input"
              />
            </div>
          </div>
        </div>

        {/* Location Access */}
        <div className="dashboard-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
              <MapPin className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h2 className="font-medium text-foreground">GPS Location</h2>
              <p className="text-sm text-muted-foreground">
                Enable for customers to find you nearby
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={requestLocation}
            disabled={locationLoading}
            className="google-input-button"
          >
            <MapPin className="h-4 w-4 mr-2" />
            {locationLoading ? "Getting location..." : "Update Business Location"}
          </Button>
          {location && (
            <p className="text-sm text-muted-foreground">
              Location saved: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </p>
          )}
        </div>

        {/* Appearance */}
        <div className="dashboard-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
              <Palette className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h2 className="font-medium text-foreground">Appearance</h2>
              <p className="text-sm text-muted-foreground">
                Choose your preferred theme
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-sm text-muted-foreground">Toggle dark/light mode</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleSave} disabled={saving} className="google-input-button">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={signOut} className="google-input-button">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
