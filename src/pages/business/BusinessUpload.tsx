import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/ui/tag-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Wrench, ImagePlus, Loader2, X } from "lucide-react";
import { FilteredInput, FilteredTextarea } from "@/components/ui/filtered-input";
import { isContentSafe } from "@/lib/contentFilter";

const serviceCategories = [
  "Home Services",
  "Beauty & Wellness",
  "Repairs & Maintenance",
  "Professional Services",
  "Events & Entertainment",
  "Education & Training",
  "Transportation",
  "Health & Fitness",
  "Other",
];

export default function BusinessUpload() {
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("product");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Product form state
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productNicknames, setProductNicknames] = useState<string[]>([]);
  const [productInStock, setProductInStock] = useState(true);
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);

  // Service form state
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [servicePriceType, setServicePriceType] = useState<"fixed" | "hourly" | "range" | "quote">("fixed");
  const [servicePriceMin, setServicePriceMin] = useState("");
  const [servicePriceMax, setServicePriceMax] = useState("");
  const [serviceDuration, setServiceDuration] = useState("");
  const [serviceAvailability, setServiceAvailability] = useState<"available" | "busy" | "unavailable">("available");
  const [serviceLocations, setServiceLocations] = useState<string[]>([]);
  const [serviceImages, setServiceImages] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState("");

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${business?.id}/${Date.now()}.${fileExt}`;

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

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setProductImageFile(file);
      setProductImageUrl(URL.createObjectURL(file));
    }
  };

  const handleServiceImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !business?.id) return;

    setUploading(true);
    const newUrls: string[] = [];

    for (let i = 0; i < Math.min(files.length, 5); i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) continue;
      const url = await uploadImage(file);
      if (url) newUrls.push(url);
    }

    setServiceImages([...serviceImages, ...newUrls].slice(0, 5));
    setUploading(false);
  };

  const resetProductForm = () => {
    setProductName("");
    setProductDescription("");
    setProductPrice("");
    setProductNicknames([]);
    setProductInStock(true);
    setProductImageUrl(null);
    setProductImageFile(null);
  };

  const resetServiceForm = () => {
    setServiceName("");
    setServiceDescription("");
    setServiceCategory("");
    setServicePriceType("fixed");
    setServicePriceMin("");
    setServicePriceMax("");
    setServiceDuration("");
    setServiceAvailability("available");
    setServiceLocations([]);
    setServiceImages([]);
    setLocationInput("");
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id) return;

    // Content filter check
    if (!isContentSafe(productName) || !isContentSafe(productDescription)) {
      toast.error("Please remove prohibited content before saving");
      return;
    }

    setSaving(true);
    try {
      let finalImageUrl = productImageUrl;
      if (productImageFile) {
        setUploading(true);
        finalImageUrl = await uploadImage(productImageFile);
        setUploading(false);
      }

      const { error } = await supabase.from("products").insert({
        business_id: business.id,
        name: productName.trim(),
        description: productDescription.trim() || null,
        price: productPrice ? parseFloat(productPrice) : null,
        tags: productNicknames.length > 0 ? productNicknames : null,
        in_stock: productInStock,
        image_url: finalImageUrl,
      });

      if (error) throw error;

      toast.success("Product added successfully!");
      resetProductForm();
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (error) {
      toast.error("Failed to add product");
    } finally {
      setSaving(false);
    }
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id) return;

    // Content filter check
    if (!isContentSafe(serviceName) || !isContentSafe(serviceDescription)) {
      toast.error("Please remove prohibited content before saving");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("services").insert({
        business_id: business.id,
        name: serviceName.trim(),
        description: serviceDescription.trim() || null,
        category: serviceCategory || null,
        price_type: servicePriceType,
        price_min: servicePriceMin ? parseFloat(servicePriceMin) : null,
        price_max: servicePriceMax ? parseFloat(servicePriceMax) : null,
        duration_estimate: serviceDuration || null,
        availability: serviceAvailability,
        location_coverage: serviceLocations,
        images: serviceImages,
      });

      if (error) throw error;

      toast.success("Service added successfully!");
      resetServiceForm();
      queryClient.invalidateQueries({ queryKey: ["business-services"] });
    } catch (error) {
      toast.error("Failed to add service");
    } finally {
      setSaving(false);
    }
  };

  const addLocation = () => {
    if (locationInput.trim() && !serviceLocations.includes(locationInput.trim())) {
      setServiceLocations([...serviceLocations, locationInput.trim()]);
      setLocationInput("");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Upload</h1>
          <p className="mt-1 text-muted-foreground">Add products or services to your catalog</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="product" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Product
            </TabsTrigger>
            <TabsTrigger value="service" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Service
            </TabsTrigger>
          </TabsList>

          {/* Product Form */}
          <TabsContent value="product">
            <Card>
              <CardHeader>
                <CardTitle>Add New Product</CardTitle>
                <CardDescription>Add a product to sell to customers</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProductSubmit} className="space-y-4">
                  {/* Image Upload */}
                  <div>
                    <Label>Product Image</Label>
                    <div
                      className="mt-1 relative border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-foreground/50 transition-colors"
                      onClick={() => document.getElementById("product-image")?.click()}
                    >
                      {productImageUrl ? (
                        <img
                          src={productImageUrl}
                          alt="Preview"
                          className="w-full h-40 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <ImagePlus className="h-10 w-10" />
                          <span>Click to upload</span>
                        </div>
                      )}
                      <input
                        id="product-image"
                        type="file"
                        accept="image/*"
                        onChange={handleProductImageChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="product-name">Product Name *</Label>
                    <FilteredInput
                      id="product-name"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g., Classic Burger"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Alternative Names</Label>
                    <TagInput
                      value={productNicknames}
                      onChange={setProductNicknames}
                      placeholder="Add nickname..."
                      maxTags={10}
                    />
                  </div>

                  <div>
                    <Label htmlFor="product-desc">Description</Label>
                    <FilteredTextarea
                      id="product-desc"
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      placeholder="Describe your product..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="product-price">Price (₦)</Label>
                    <Input
                      id="product-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="in-stock">Available / In Stock</Label>
                    <Switch
                      id="in-stock"
                      checked={productInStock}
                      onCheckedChange={setProductInStock}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={saving || !productName.trim()}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Product
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Service Form */}
          <TabsContent value="service">
            <Card>
              <CardHeader>
                <CardTitle>Add New Service</CardTitle>
                <CardDescription>Add a service you offer to customers</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleServiceSubmit} className="space-y-4">
                  {/* Service Images */}
                  <div>
                    <Label>Service Images (up to 5)</Label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {serviceImages.map((url, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={url}
                            alt={`Service ${idx + 1}`}
                            className="h-20 w-20 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                            onClick={() => setServiceImages(serviceImages.filter((_, i) => i !== idx))}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {serviceImages.length < 5 && (
                        <div
                          className="h-20 w-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-foreground/50"
                          onClick={() => document.getElementById("service-images")?.click()}
                        >
                          {uploading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <ImagePlus className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>
                    <input
                      id="service-images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleServiceImagesChange}
                      className="hidden"
                    />
                  </div>

                  <div>
                    <Label htmlFor="service-name">Service Name *</Label>
                    <FilteredInput
                      id="service-name"
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder="e.g., House Cleaning"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="service-desc">Description</Label>
                    <FilteredTextarea
                      id="service-desc"
                      value={serviceDescription}
                      onChange={(e) => setServiceDescription(e.target.value)}
                      placeholder="Describe your service..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Category</Label>
                    <Select value={serviceCategory} onValueChange={setServiceCategory}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Pricing Type</Label>
                      <Select value={servicePriceType} onValueChange={(v) => setServicePriceType(v as any)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed Price</SelectItem>
                          <SelectItem value="hourly">Hourly Rate</SelectItem>
                          <SelectItem value="range">Price Range</SelectItem>
                          <SelectItem value="quote">Quote on Request</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Availability</Label>
                      <Select value={serviceAvailability} onValueChange={(v) => setServiceAvailability(v as any)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="busy">Busy</SelectItem>
                          <SelectItem value="unavailable">Unavailable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {servicePriceType !== "quote" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{servicePriceType === "range" ? "Min Price (₦)" : "Price (₦)"}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={servicePriceMin}
                          onChange={(e) => setServicePriceMin(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      {servicePriceType === "range" && (
                        <div>
                          <Label>Max Price (₦)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={servicePriceMax}
                            onChange={(e) => setServicePriceMax(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <Label>Duration Estimate</Label>
                    <Input
                      value={serviceDuration}
                      onChange={(e) => setServiceDuration(e.target.value)}
                      placeholder="e.g., 2-3 hours"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Service Locations</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        placeholder="Add location"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLocation())}
                      />
                      <Button type="button" variant="secondary" onClick={addLocation}>
                        Add
                      </Button>
                    </div>
                    {serviceLocations.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {serviceLocations.map((loc) => (
                          <span
                            key={loc}
                            className="px-2 py-1 bg-muted rounded-full text-sm flex items-center gap-1"
                          >
                            {loc}
                            <button
                              type="button"
                              onClick={() => setServiceLocations(serviceLocations.filter((l) => l !== loc))}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={saving || !serviceName.trim()}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Service
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
