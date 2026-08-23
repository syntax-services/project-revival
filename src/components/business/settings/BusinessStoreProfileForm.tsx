/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { optimizeImage } from "@/lib/imageOptimizer";
import { supabase } from "@/integrations/supabase/client";
import { StructuredLocationPicker } from "@/components/location/StructuredLocationPicker";
import { StructuredLocationSelection } from "@/hooks/useStructuredLocations";

interface BusinessStoreProfileFormProps {
  businessData: any;
  setBusinessData: React.Dispatch<React.SetStateAction<any>>;
  structuredLocation: StructuredLocationSelection | null;
  setStructuredLocation: (loc: StructuredLocationSelection | null) => void;
  userId?: string;
  refreshProfile: () => Promise<void>;
}

export function BusinessStoreProfileForm({
  businessData,
  setBusinessData,
  structuredLocation,
  setStructuredLocation,
  userId,
  refreshProfile,
}: BusinessStoreProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Cover image must be less than 5MB.");
      return;
    }

    setUploading(true);
    try {
      const optimizedFile = await optimizeImage(file);
      const fileExt = optimizedFile.name.split(".").pop();
      const fileName = `${userId}/cover-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("business-images")
        .upload(fileName, optimizedFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("business-images").getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from("businesses")
        .update({ cover_image_url: publicUrl })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      setBusinessData((prev: any) => prev ? { ...prev, cover_image_url: publicUrl } : null);
      await refreshProfile();
      toast.success("Cover image updated successfully! ");
    } catch (error: any) {
      console.error("Cover upload failed:", error);
      toast.error(error.message || "Failed to update cover image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-5 border-t border-border/10 space-y-5 text-left">
      {/* Cover Image Upload */}
      <div className="space-y-3">
        <Label>Shop Cover Image</Label>
        <div className="relative h-40 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-border/10">
          {businessData?.cover_image_url ? (
            <img
              src={businessData.cover_image_url}
              alt="Business cover"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-4xl font-bold text-primary/30">
                {businessData?.company_name?.charAt(0) || "B"}
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
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full h-9 rounded-xl text-xs"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Upload Cover Image"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company / Shop Name</Label>
          <Input
            id="companyName"
            value={businessData?.company_name || ""}
            onChange={(e) =>
              setBusinessData((prev: any) => prev ? { ...prev, company_name: e.target.value } : null)
            }
            className="google-input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="industry">Industry / Category</Label>
          <Input
            id="industry"
            value={businessData?.industry || ""}
            onChange={(e) =>
              setBusinessData((prev: any) => prev ? { ...prev, industry: e.target.value } : null)
            }
            className="google-input"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="website">Website Link</Label>
          <Input
            id="website"
            value={businessData?.website || ""}
            onChange={(e) =>
              setBusinessData((prev: any) => prev ? { ...prev, website: e.target.value } : null)
            }
            placeholder="https://"
            className="google-input"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="products">Description of Offerings</Label>
          <Textarea
            id="products"
            value={businessData?.products_services || ""}
            onChange={(e) =>
              setBusinessData((prev: any) => prev ? { ...prev, products_services: e.target.value } : null)
            }
            placeholder="Describe what you offer..."
            className="google-input min-h-[100px]"
          />
        </div>
      </div>

      {/* Structured Location */}
      <div className="space-y-2 pt-2 border-t border-border/10">
        <StructuredLocationPicker
          label="Store pickup / delivery point"
          value={structuredLocation}
          onChange={setStructuredLocation}
        />
        {!structuredLocation && businessData?.business_location && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Current saved location: {businessData.business_location}
          </p>
        )}
      </div>
    </div>
  );
}
