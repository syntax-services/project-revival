import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useOffers } from "@/hooks/useOffers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FilteredInput, FilteredTextarea } from "@/components/ui/filtered-input";
import { isContentSafe } from "@/lib/contentFilter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Package, 
  Wrench, 
  Briefcase, 
  Users, 
  ImagePlus, 
  Video, 
  Loader2,
  X
} from "lucide-react";
import { toast } from "sonner";

const offerTypes = [
  { value: "product", label: "Product Request", icon: Package, description: "Looking for a specific product" },
  { value: "service", label: "Service Request", icon: Wrench, description: "Need a service provider" },
  { value: "employment", label: "Employment", icon: Briefcase, description: "Looking for workers/employees" },
  { value: "collaboration", label: "Collaboration", icon: Users, description: "Partnership or joint venture" },
];

const urgencyOptions = [
  { value: "low", label: "Low - No rush" },
  { value: "medium", label: "Medium - Within a week" },
  { value: "high", label: "High - Within 2-3 days" },
  { value: "urgent", label: "Urgent - ASAP" },
];

export function CreateOfferPanel() {
  const { user, profile } = useAuth();
  const { createOffer } = useOffers();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [offerType, setOfferType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [location, setLocation] = useState("");
  const [urgency, setUrgency] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");

  const resetForm = () => {
    setOfferType("");
    setTitle("");
    setDescription("");
    setBudgetMin("");
    setBudgetMax("");
    setLocation("");
    setUrgency("");
    setImages([]);
    setVideoUrl("");
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `offers/${user?.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("business-images")
      .upload(fileName, file);

    if (uploadError) {
      toast.error("Failed to upload image");
      return null;
    }

    const { data } = supabase.storage.from("business-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploading(true);
    const newUrls: string[] = [];

    for (let i = 0; i < Math.min(files.length, 5 - images.length); i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) continue; // 10MB max
      const url = await uploadImage(file);
      if (url) newUrls.push(url);
    }

    setImages([...images, ...newUrls]);
    setUploading(false);
  };

  const removeImage = (idx: number) => {
    setImages(images.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isContentSafe(title) || !isContentSafe(description)) {
      toast.error("Please remove prohibited content before submitting");
      return;
    }

    if (!offerType || !title.trim()) {
      toast.error("Please fill in the required fields");
      return;
    }

    setSaving(true);
    try {
      await createOffer.mutateAsync({
        offer_type: offerType as any,
        title: title.trim(),
        description: description.trim() || undefined,
        budget_min: budgetMin ? parseFloat(budgetMin) : undefined,
        budget_max: budgetMax ? parseFloat(budgetMax) : undefined,
        location: location.trim() || undefined,
        urgency: urgency as any || undefined,
        images: images.length > 0 ? images : undefined,
        video_url: videoUrl.trim() || undefined,
      });
      resetForm();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const selectedType = offerTypes.find(t => t.value === offerType);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Request
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a Request</DialogTitle>
          <DialogDescription>
            Request products, services, employment, or collaborations that aren't available yet
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-2">
            {offerTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = offerType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setOfferType(type.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? "border-foreground bg-accent"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <p className="font-medium text-sm">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </button>
              );
            })}
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <FilteredInput
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                offerType === "product" ? "e.g., Looking for vintage cameras" :
                offerType === "service" ? "e.g., Need a plumber for bathroom renovation" :
                offerType === "employment" ? "e.g., Hiring experienced barbers" :
                "e.g., Partner needed for food delivery startup"
              }
              required
              className="mt-1"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <FilteredTextarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what you're looking for in detail..."
              rows={4}
              className="mt-1"
            />
          </div>

          {/* Budget Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Min Budget (₦)</Label>
              <Input
                type="number"
                min="0"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Max Budget (₦)</Label>
              <Input
                type="number"
                min="0"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="0"
                className="mt-1"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Lagos, Nigeria"
              className="mt-1"
            />
          </div>

          {/* Urgency */}
          <div>
            <Label>Urgency</Label>
            <Select value={urgency} onValueChange={setUrgency}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="How soon do you need this?" />
              </SelectTrigger>
              <SelectContent>
                {urgencyOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Images */}
          <div>
            <Label>Reference Images (optional, up to 5)</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {images.map((url, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={url}
                    alt={`Reference ${idx + 1}`}
                    className="h-16 w-16 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    onClick={() => removeImage(idx)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="h-16 w-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-muted-foreground">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Video URL */}
          <div>
            <Label htmlFor="video">Video URL (optional)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Video className="h-4 w-4 text-muted-foreground" />
              <Input
                id="video"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/... or direct video link"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={saving || !offerType || !title.trim()}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit Request
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
