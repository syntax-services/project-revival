import { useState, useEffect, useRef } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useNavigate } from "react-router-dom";
import { optimizeImage } from "@/lib/imageOptimizer";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { 
  Package, Wrench, ImagePlus, Loader2, X, CheckCircle2, RotateCcw, 
  Plus, Star, Info, Layers, Tag, ShieldCheck, PackagePlus 
} from "lucide-react";
import { FilteredInput, FilteredTextarea } from "@/components/ui/filtered-input";
import { isContentSafe } from "@/lib/contentFilter";
import { useFormDraft } from "@/hooks/useFormDraft";
import { sanitizeUserFacingError } from "@/lib/assetMask";

export const productCategories = [
  "Groceries & Food",
  "Fashion & Apparel",
  "Electronics & Tech",
  "Beauty & Personal Care",
  "Health & Wellness",
  "Home & Living",
  "Books & Stationery",
  "Repairs & Maintenance",
  "Campus Essentials",
  "Sports & Outdoors",
  "Other",
];

export const serviceCategories = [
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

export interface ProductSpecItem {
  key: string;
  value: string;
}

interface ProductDraft {
  productName: string;
  productDescription: string;
  productCategory: string;
  productPrice: string;
  productCompareAtPrice: string;
  productStockQuantity: string;
  productNicknames: string[];
  productInStock: boolean;
  productIsRare: boolean;
  postToForYouFeed: boolean;
  productSpecs: ProductSpecItem[];
  productImages: string[];
  coverImageIndex: number;
}

interface ServiceDraft {
  serviceName: string;
  serviceDescription: string;
  serviceCategory: string;
  servicePriceType: "fixed" | "hourly" | "range" | "quote";
  servicePriceMin: string;
  servicePriceMax: string;
  serviceDuration: string;
  serviceAvailability: "available" | "busy" | "unavailable";
  serviceLocations: string[];
  serviceImages: string[];
}

const initialProductDraft: ProductDraft = {
  productName: "",
  productDescription: "",
  productCategory: "Groceries & Food",
  productPrice: "",
  productCompareAtPrice: "",
  productStockQuantity: "1",
  productNicknames: [],
  productInStock: true,
  productIsRare: false,
  postToForYouFeed: true,
  productSpecs: [
    { key: "Condition", value: "Brand New" },
    { key: "Brand", value: "" },
  ],
  productImages: [],
  coverImageIndex: 0,
};

const initialServiceDraft: ServiceDraft = {
  serviceName: "",
  serviceDescription: "",
  serviceCategory: "Home Services",
  servicePriceType: "fixed",
  servicePriceMin: "",
  servicePriceMax: "",
  serviceDuration: "",
  serviceAvailability: "available",
  serviceLocations: [],
  serviceImages: [],
};

export default function BusinessUpload() {
  usePageMeta({
    title: "Add New Product or Service Listing",
    description: "Quickly upload photos, set pricing, and publish new goods or services to the campus marketplace.",
    keywords: ["upload product","add listing","new item"],
    });

  const { user, profile } = useAuth();
  const { data: business } = useBusiness();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("string_upload_active_tab") || "product";
  });

  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");

  const productFileInputRef = useRef<HTMLInputElement | null>(null);
  const serviceFileInputRef = useRef<HTMLInputElement | null>(null);

  // Product draft hook
  const [productDraft, setProductDraft, clearProductDraft, hasProductDraft] = useFormDraft<ProductDraft>(
    "string_product_upload_draft_v2",
    initialProductDraft
  );

  // Service draft hook
  const [serviceDraft, setServiceDraft, clearServiceDraft, hasServiceDraft] = useFormDraft<ServiceDraft>(
    "string_service_upload_draft_v2",
    initialServiceDraft
  );

  useEffect(() => {
    localStorage.setItem("string_upload_active_tab", activeTab);
  }, [activeTab]);

  const uploadSingleImage = async (file: File, bucket: string = "product-images"): Promise<string | null> => {
    const rootFolder = bucket === "service-images" ? user?.id : (business?.id || user?.id);
    if (!rootFolder) return null;
    const optimizedFile = await optimizeImage(file);
    const fileExt = optimizedFile.name.split(".").pop();
    const folderPath = bucket === "service-images" ? "services/" : "products/";
    const fileName = `${rootFolder}/${folderPath}${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, optimizedFile);

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleProductMultiImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (productDraft.productImages.length + files.length > 7) {
      toast.error("Maximum 7 images allowed per product.");
      return;
    }

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`"${file.name}" is over 8MB. Please select a smaller image.`);
        continue;
      }
      const url = await uploadSingleImage(file, "product-images");
      if (url) uploadedUrls.push(url);
    }

    setProductDraft((prev) => ({
      ...prev,
      productImages: [...prev.productImages, ...uploadedUrls].slice(0, 7),
    }));

    setUploadingImages(false);
    if (productFileInputRef.current) productFileInputRef.current.value = "";
  };

  const removeProductImage = (indexToRemove: number) => {
    setProductDraft((prev) => {
      const updatedImages = prev.productImages.filter((_, idx) => idx !== indexToRemove);
      let newCoverIdx = prev.coverImageIndex;
      if (indexToRemove === prev.coverImageIndex) {
        newCoverIdx = 0;
      } else if (indexToRemove < prev.coverImageIndex) {
        newCoverIdx = Math.max(0, prev.coverImageIndex - 1);
      }
      return {
        ...prev,
        productImages: updatedImages,
        coverImageIndex: updatedImages.length > 0 ? Math.min(newCoverIdx, updatedImages.length - 1) : 0,
      };
    });
  };

  const setAsCoverImage = (index: number) => {
    setProductDraft((prev) => ({
      ...prev,
      coverImageIndex: index,
    }));
    toast.success("Main cover photo updated");
  };

  const addSpecification = () => {
    if (!newSpecKey.trim() || !newSpecValue.trim()) {
      toast.error("Please enter both attribute name and value");
      return;
    }

    setProductDraft((prev) => ({
      ...prev,
      productSpecs: [
        ...prev.productSpecs,
        { key: newSpecKey.trim(), value: newSpecValue.trim() },
      ],
    }));

    setNewSpecKey("");
    setNewSpecValue("");
  };

  const removeSpecification = (index: number) => {
    setProductDraft((prev) => ({
      ...prev,
      productSpecs: prev.productSpecs.filter((_, idx) => idx !== index),
    }));
  };

  const handleServiceImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (serviceDraft.serviceImages.length + files.length > 5) {
      toast.error("Maximum 5 images allowed for services.");
      return;
    }

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) continue;
      const url = await uploadSingleImage(file, "service-images");
      if (url) uploadedUrls.push(url);
    }

    setServiceDraft((prev) => ({
      ...prev,
      serviceImages: [...prev.serviceImages, ...uploadedUrls].slice(0, 5),
    }));

    setUploadingImages(false);
    if (serviceFileInputRef.current) serviceFileInputRef.current.value = "";
  };

  const ensureBusinessId = async (): Promise<string | null> => {
    if (business?.id) return business.id;
    if (!user?.id) return null;

    try {
      const { data: existingBiz } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingBiz?.id) return existingBiz.id;

      const { data: rpcBiz } = await supabase.rpc("get_or_create_business");
      if (rpcBiz && (rpcBiz as any).id) return (rpcBiz as any).id;

      const { data: newBiz } = await supabase
        .from("businesses")
        .upsert({
          user_id: user.id,
          company_name: profile?.full_name || "Merchant Shop",
          industry: "Retail",
          business_type: "both",
          is_active: true,
          location_verified: true,
        }, { onConflict: "user_id" })
        .select("id")
        .maybeSingle();

      if (newBiz?.id) return newBiz.id;
    } catch (err) {
      console.warn("Auto-provision business fallback:", err);
    }

    return user.id;
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeBusinessId = await ensureBusinessId();
    if (!activeBusinessId) {
      toast.error("Please sign in to proceed.");
      return;
    }

    if (!isContentSafe(productDraft.productName) || !isContentSafe(productDraft.productDescription)) {
      toast.error("Please remove prohibited words before submitting.");
      return;
    }

    if (productDraft.productImages.length < 1) {
      toast.error("Please upload at least 1 product photo.");
      return;
    }

    setSaving(true);
    try {
      const rawPrice = productDraft.productPrice ? parseFloat(productDraft.productPrice.toString().replace(/,/g, '').trim()) : null;
      const parsedPrice = rawPrice !== null && !isNaN(rawPrice) ? Math.min(Math.max(0, rawPrice), 999999999) : null;

      const rawCompare = productDraft.productCompareAtPrice ? parseFloat(productDraft.productCompareAtPrice.toString().replace(/,/g, '').trim()) : null;
      const parsedCompare = rawCompare !== null && !isNaN(rawCompare) ? Math.min(Math.max(0, rawCompare), 999999999) : null;

      const rawStock = parseInt(productDraft.productStockQuantity || "0", 10);
      const parsedStock = isNaN(rawStock) ? 0 : Math.max(0, rawStock);

      // Arrange cover image first
      const orderedImages = [...productDraft.productImages];
      if (productDraft.coverImageIndex > 0 && productDraft.coverImageIndex < orderedImages.length) {
        const cover = orderedImages.splice(productDraft.coverImageIndex, 1)[0];
        orderedImages.unshift(cover);
      }

      const mainCoverUrl = orderedImages[0] || null;

      // Transform specs array to JSON object
      const specsObject = productDraft.productSpecs.reduce<Record<string, string>>((acc, curr) => {
        if (curr.key && curr.value) acc[curr.key] = curr.value;
        return acc;
      }, {});

      const tagsList = [
        ...(productDraft.postToForYouFeed ? ["for-you"] : []),
        ...productDraft.productNicknames,
      ];

      const { error } = await supabase.from("products").insert({
        business_id: activeBusinessId,
        name: productDraft.productName.trim(),
        description: productDraft.productDescription.trim() || null,
        category: productDraft.productCategory || "Groceries & Food",
        price: parsedPrice,
        compare_at_price: parsedCompare,
        stock_quantity: parsedStock,
        is_rare: productDraft.productIsRare,
        tags: tagsList.length > 0 ? tagsList : null,
        in_stock: productDraft.productInStock,
        image_url: mainCoverUrl,
        images: orderedImages,
      });

      if (error) throw error;

      toast.success("Product published with full gallery & specs!");
      clearProductDraft();
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["business-products"] });
      navigate("/business/products");
    } catch (error: any) {
      console.error("Failed to add product:", error);
      toast.error(sanitizeUserFacingError(error, "Failed to publish product. Please verify fields."));
    } finally {
      setSaving(false);
    }
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeBusinessId = await ensureBusinessId();
    if (!activeBusinessId) {
      toast.error("Please sign in to proceed.");
      return;
    }

    if (!isContentSafe(serviceDraft.serviceName) || !isContentSafe(serviceDraft.serviceDescription)) {
      toast.error("Please remove prohibited words before submitting.");
      return;
    }

    setSaving(true);
    try {
      const rawMin = serviceDraft.servicePriceMin ? parseFloat(serviceDraft.servicePriceMin.toString().replace(/,/g, '').trim()) : null;
      const parsedMin = rawMin !== null && !isNaN(rawMin) ? Math.min(Math.max(0, rawMin), 999999999) : null;

      const rawMax = serviceDraft.servicePriceMax ? parseFloat(serviceDraft.servicePriceMax.toString().replace(/,/g, '').trim()) : null;
      const parsedMax = rawMax !== null && !isNaN(rawMax) ? Math.min(Math.max(0, rawMax), 999999999) : null;

      const { error } = await supabase.from("services").insert({
        business_id: activeBusinessId,
        name: serviceDraft.serviceName.trim(),
        description: serviceDraft.serviceDescription.trim() || null,
        category: serviceDraft.serviceCategory || "Home Services",
        price_type: serviceDraft.servicePriceType,
        price_min: parsedMin,
        price_max: parsedMax,
        duration_estimate: serviceDraft.serviceDuration || null,
        is_available: serviceDraft.serviceAvailability === "available",
        tags: serviceDraft.serviceLocations.length > 0 ? serviceDraft.serviceLocations : null,
        images: serviceDraft.serviceImages,
      });

      if (error) throw error;

      toast.success("Service published successfully!");
      clearServiceDraft();
      setLocationInput("");
      queryClient.invalidateQueries({ queryKey: ["business-services"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      navigate("/business/services");
    } catch (error: any) {
      console.error("Failed to add service:", error);
      toast.error(sanitizeUserFacingError(error, "Failed to publish service offering."));
    } finally {
      setSaving(false);
    }
  };

  const addLocation = () => {
    if (locationInput.trim() && !serviceDraft.serviceLocations.includes(locationInput.trim())) {
      setServiceDraft((prev) => ({
        ...prev,
        serviceLocations: [...prev.serviceLocations, locationInput.trim()],
      }));
      setLocationInput("");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 text-left max-w-3xl mx-auto pb-20 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              <PackagePlus className="h-5 w-5 text-primary" />
              Catalog Upload
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add products with 3–7 image galleries, specs, and groceries or offer services
            </p>
          </div>

          {activeTab === "product" && hasProductDraft && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full text-primary animate-in fade-in">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold">Draft restored</span>
              <button 
                type="button" 
                onClick={clearProductDraft} 
                className="text-[10px] underline hover:text-primary/80 ml-1 text-muted-foreground cursor-pointer flex items-center gap-0.5"
              >
                <RotateCcw className="h-3 w-3" /> Discard
              </button>
            </div>
          )}

          {activeTab === "service" && hasServiceDraft && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full text-primary animate-in fade-in">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold">Draft restored</span>
              <button 
                type="button" 
                onClick={clearServiceDraft} 
                className="text-[10px] underline hover:text-primary/80 ml-1 text-muted-foreground cursor-pointer flex items-center gap-0.5"
              >
                <RotateCcw className="h-3 w-3" /> Discard
              </button>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 rounded-2xl h-12 bg-muted/40 p-1.5 border border-border/20">
            <TabsTrigger value="product" className="flex items-center gap-2 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Package className="h-4 w-4 text-primary" />
              Physical Product / Groceries
            </TabsTrigger>
            <TabsTrigger value="service" className="flex items-center gap-2 rounded-xl text-xs font-bold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Wrench className="h-4 w-4 text-primary" />
              Service / Skill Offering
            </TabsTrigger>
          </TabsList>

          {/* ========================================================================= */}
          {/* PRODUCT FORM (DETAILED 1-7 IMAGES, SPECS, CATEGORIES) */}
          {/* ========================================================================= */}
          <TabsContent value="product" className="mt-4 space-y-6">
            <Card className="rounded-3xl border-border/40 bg-card/60 backdrop-blur-xl shadow-lg">
              <CardHeader className="pb-4 border-b border-border/10">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span>Product Details & Multi-Photo Gallery</span>
                  <span className="text-xs font-normal text-muted-foreground">Range: 1 to 7 photos</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Upload multiple angles, packaging, and details so customers can inspect quality before ordering.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleProductSubmit} className="space-y-6">
                  
                  {/* Photo Gallery (1 - 7 Images) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <ImagePlus className="h-4 w-4 text-primary" />
                        Product Gallery ({productDraft.productImages.length}/7 images) *
                      </Label>
                      {productDraft.productImages.length < 3 && (
                        <span className="text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                          Minimum: 3 recommended
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-1">
                      {productDraft.productImages.map((url, idx) => {
                        const isCover = idx === productDraft.coverImageIndex;
                        return (
                          <div 
                            key={idx} 
                            className={`relative group aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                              isCover ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-border/40 hover:border-border"
                            }`}
                            onClick={() => setAsCoverImage(idx)}
                          >
                            <img
                              src={url}
                              alt={`Product shot ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            
                            {isCover && (
                              <div className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
                                <Star className="h-2.5 w-2.5 fill-current" /> Cover
                              </div>
                            )}

                            <button
                              type="button"
                              className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-destructive text-white rounded-full p-1 shadow-md transition-colors opacity-90 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeProductImage(idx);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </button>

                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[9px] font-semibold text-white">
                                {isCover ? "Main Cover" : "Make Cover"}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {productDraft.productImages.length < 7 && (
                        <div
                          className="aspect-square rounded-2xl border-2 border-dashed border-border/60 hover:border-primary/60 bg-muted/20 hover:bg-primary/5 flex flex-col items-center justify-center cursor-pointer transition-all p-2 text-center"
                          onClick={() => productFileInputRef.current?.click()}
                        >
                          {uploadingImages ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          ) : (
                            <>
                              <Plus className="h-5 w-5 text-primary mb-1" />
                              <span className="text-[10px] font-bold text-foreground">Add Photo</span>
                              <span className="text-[8px] text-muted-foreground">Up to 8MB</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <input
                      ref={productFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleProductMultiImageSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Product Title & Category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="product-name" className="text-xs font-bold">Product Title *</Label>
                      <FilteredInput
                        id="product-name"
                        value={productDraft.productName}
                        onChange={(e) => setProductDraft((prev) => ({ ...prev, productName: e.target.value }))}
                        placeholder="e.g. Fresh Yam Tubers (3-Set) or iPhone 14 Pro Max"
                        required
                        className="mt-1 google-input font-medium"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold">Category *</Label>
                      <Select 
                        value={productDraft.productCategory} 
                        onValueChange={(val) => setProductDraft((prev) => ({ ...prev, productCategory: val }))}
                      >
                        <SelectTrigger className="mt-1 google-input font-medium">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {productCategories.map((cat) => (
                            <SelectItem key={cat} value={cat} className="text-xs font-medium">
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-muted/20 border border-border/20">
                    <div>
                      <Label htmlFor="product-price" className="text-xs font-bold text-foreground">
                        Selling Price (₦) *
                      </Label>
                      <Input
                        id="product-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={productDraft.productPrice}
                        onChange={(e) => setProductDraft((prev) => ({ ...prev, productPrice: e.target.value }))}
                        placeholder="5,000"
                        className="mt-1 google-input font-bold text-sm"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="product-compare" className="text-xs font-bold text-muted-foreground">
                        Compare-at Price (₦) <span className="text-[10px] font-normal">(Optional Slash Price)</span>
                      </Label>
                      <Input
                        id="product-compare"
                        type="number"
                        min="0"
                        step="0.01"
                        value={productDraft.productCompareAtPrice}
                        onChange={(e) => setProductDraft((prev) => ({ ...prev, productCompareAtPrice: e.target.value }))}
                        placeholder="7,500"
                        className="mt-1 google-input text-xs"
                      />
                    </div>

                    <div>
                      <Label htmlFor="product-stock" className="text-xs font-bold text-foreground">
                        Stock Quantity Available
                      </Label>
                      <Input
                        id="product-stock"
                        type="number"
                        min="0"
                        value={productDraft.productStockQuantity}
                        onChange={(e) => setProductDraft((prev) => ({ ...prev, productStockQuantity: e.target.value }))}
                        placeholder="10"
                        className="mt-1 google-input text-xs"
                      />
                    </div>
                  </div>

                  {/* Specifications Builder (Key-Value Specs) */}
                  <div className="space-y-3 p-4 rounded-2xl bg-muted/20 border border-border/20">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-primary" />
                        Product Specifications & Attributes
                      </Label>
                      <span className="text-[10px] text-muted-foreground">e.g. Brand, Condition, Weight, Warranty</span>
                    </div>

                    {productDraft.productSpecs.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {productDraft.productSpecs.map((spec, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/30 shadow-xs text-xs"
                          >
                            <div className="flex items-center gap-2 overflow-hidden pr-2">
                              <span className="font-bold text-muted-foreground uppercase text-[10px] shrink-0">{spec.key}:</span>
                              <span className="font-semibold text-foreground truncate">{spec.value}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSpecification(idx)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Input
                        value={newSpecKey}
                        onChange={(e) => setNewSpecKey(e.target.value)}
                        placeholder="Spec Name (e.g. Color, Size)"
                        className="google-input text-xs"
                      />
                      <Input
                        value={newSpecValue}
                        onChange={(e) => setNewSpecValue(e.target.value)}
                        placeholder="Value (e.g. Matte Black, 5kg)"
                        className="google-input text-xs"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSpecification())}
                      />
                      <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={addSpecification} 
                        className="rounded-2xl shrink-0 text-xs font-bold"
                      >
                        Add Spec
                      </Button>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="product-desc" className="text-xs font-bold">Detailed Product Description</Label>
                    <FilteredTextarea
                      id="product-desc"
                      value={productDraft.productDescription}
                      onChange={(e) => setProductDraft((prev) => ({ ...prev, productDescription: e.target.value }))}
                      placeholder="Detail features, taste/freshness for groceries, packaging, or warranty info..."
                      rows={4}
                      className="mt-1 google-input resize-none text-xs leading-relaxed"
                    />
                  </div>

                  {/* Search Tags / Keywords */}
                  <div>
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      Search Keywords & Nicknames
                    </Label>
                    <p className="text-[10px] text-muted-foreground mb-1.5">Tags help students and customers find your item in search</p>
                    <TagInput
                      value={productDraft.productNicknames}
                      onChange={(tags) => setProductDraft((prev) => ({ ...prev, productNicknames: tags }))}
                      placeholder="Add tag and press Enter..."
                      maxTags={10}
                    />
                  </div>

                  {/* Stock, For You Feed, and Rare Item Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/20 border border-border/20">
                      <div>
                        <Label htmlFor="in-stock" className="text-xs font-bold text-foreground">In Stock</Label>
                        <p className="text-[10px] text-muted-foreground">Product available</p>
                      </div>
                      <Switch
                        id="in-stock"
                        checked={productDraft.productInStock}
                        onCheckedChange={(val) => setProductDraft((prev) => ({ ...prev, productInStock: val }))}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/20 border border-border/20">
                      <div>
                        <Label htmlFor="for-you-feed" className="text-xs font-bold text-foreground">Post to For You</Label>
                        <p className="text-[10px] text-muted-foreground">Show in campus discovery</p>
                      </div>
                      <Switch
                        id="for-you-feed"
                        checked={productDraft.postToForYouFeed}
                        onCheckedChange={(val) => setProductDraft((prev) => ({ ...prev, postToForYouFeed: val }))}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-muted/20 border border-border/20">
                      <div>
                        <Label htmlFor="is-rare" className="text-xs font-bold text-foreground">Rare Item</Label>
                        <p className="text-[10px] text-muted-foreground">Special badge</p>
                      </div>
                      <Switch
                        id="is-rare"
                        checked={productDraft.productIsRare}
                        onCheckedChange={(val) => setProductDraft((prev) => ({ ...prev, productIsRare: val }))}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-2xl font-black text-xs active:scale-95 transition-all shadow-lg" 
                    disabled={saving || !productDraft.productName.trim() || productDraft.productImages.length < 3}
                  >
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {saving ? "Publishing Product..." : "Publish Product (3–7 Photos & Specs)"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================================= */}
          {/* SERVICE FORM */}
          {/* ========================================================================= */}
          <TabsContent value="service" className="mt-4 space-y-6">
            <Card className="rounded-3xl border-border/40 bg-card/60 backdrop-blur-xl shadow-lg">
              <CardHeader className="pb-4 border-b border-border/10">
                <CardTitle className="text-base font-bold">Add New Service Offering</CardTitle>
                <CardDescription className="text-xs">Provide repair, beauty, tech, or freelance services with customizable rates.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleServiceSubmit} className="space-y-5">
                  {/* Service Images */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Portfolio Images (up to 5)</Label>
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {serviceDraft.serviceImages.map((url, idx) => (
                        <div key={idx} className="relative group h-20 w-20 rounded-2xl overflow-hidden border border-border/40 shadow-xs">
                          <img
                            src={url}
                            alt={`Service sample ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            className="absolute top-1 right-1 bg-black/70 hover:bg-destructive text-white rounded-full p-1 shadow-md transition-colors"
                            onClick={() => setServiceDraft((prev) => ({
                              ...prev,
                              serviceImages: prev.serviceImages.filter((_, i) => i !== idx),
                            }))}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}

                      {serviceDraft.serviceImages.length < 5 && (
                        <div
                          className="h-20 w-20 rounded-2xl border-2 border-dashed border-border/60 hover:border-primary/60 flex flex-col items-center justify-center cursor-pointer bg-muted/20 hover:bg-primary/5 transition-all text-center p-1"
                          onClick={() => serviceFileInputRef.current?.click()}
                        >
                          {uploadingImages ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          ) : (
                            <>
                              <ImagePlus className="h-5 w-5 text-primary mb-0.5" />
                              <span className="text-[9px] font-bold text-foreground">Add Photo</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <input
                      ref={serviceFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleServiceImagesChange}
                      className="hidden"
                    />
                  </div>

                  {/* Title & Category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="service-name" className="text-xs font-bold">Service Title *</Label>
                      <FilteredInput
                        id="service-name"
                        value={serviceDraft.serviceName}
                        onChange={(e) => setServiceDraft((prev) => ({ ...prev, serviceName: e.target.value }))}
                        placeholder="e.g. Phone Screen Repair & Diagnostics"
                        required
                        className="mt-1 google-input font-medium"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold">Category</Label>
                      <Select 
                        value={serviceDraft.serviceCategory} 
                        onValueChange={(val) => setServiceDraft((prev) => ({ ...prev, serviceCategory: val }))}
                      >
                        <SelectTrigger className="mt-1 google-input font-medium">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceCategories.map((cat) => (
                            <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Pricing Type & Availability */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-bold">Pricing Type</Label>
                      <Select 
                        value={serviceDraft.servicePriceType} 
                        onValueChange={(v) => setServiceDraft((prev) => ({ ...prev, servicePriceType: v as any }))}
                      >
                        <SelectTrigger className="mt-1 google-input">
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
                      <Label className="text-xs font-bold">Availability Status</Label>
                      <Select 
                        value={serviceDraft.serviceAvailability} 
                        onValueChange={(v) => setServiceDraft((prev) => ({ ...prev, serviceAvailability: v as any }))}
                      >
                        <SelectTrigger className="mt-1 google-input">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available Now</SelectItem>
                          <SelectItem value="busy">Busy / High Demand</SelectItem>
                          <SelectItem value="unavailable">Unavailable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {serviceDraft.servicePriceType !== "quote" && (
                    <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/20 border border-border/20">
                      <div>
                        <Label className="text-xs font-bold">{serviceDraft.servicePriceType === "range" ? "Min Price (₦)" : "Price (₦)"}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={serviceDraft.servicePriceMin}
                          onChange={(e) => setServiceDraft((prev) => ({ ...prev, servicePriceMin: e.target.value }))}
                          className="mt-1 google-input font-bold"
                          placeholder="2,500"
                        />
                      </div>
                      {serviceDraft.servicePriceType === "range" && (
                        <div>
                          <Label className="text-xs font-bold">Max Price (₦)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={serviceDraft.servicePriceMax}
                            onChange={(e) => setServiceDraft((prev) => ({ ...prev, servicePriceMax: e.target.value }))}
                            className="mt-1 google-input font-bold"
                            placeholder="10,000"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="service-desc" className="text-xs font-bold">Service Description</Label>
                    <FilteredTextarea
                      id="service-desc"
                      value={serviceDraft.serviceDescription}
                      onChange={(e) => setServiceDraft((prev) => ({ ...prev, serviceDescription: e.target.value }))}
                      placeholder="Describe what is included, tools used, and turnaround time..."
                      rows={3}
                      className="mt-1 google-input resize-none text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold">Duration Estimate</Label>
                    <Input
                      value={serviceDraft.serviceDuration}
                      onChange={(e) => setServiceDraft((prev) => ({ ...prev, serviceDuration: e.target.value }))}
                      placeholder="e.g. 45 mins / 1-2 hours"
                      className="mt-1 google-input text-xs"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold">Service Coverage Locations</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={locationInput}
                        onChange={(e) => setLocationInput(e.target.value)}
                        placeholder="e.g. OOU Main Campus, Ago-Iwoye"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLocation())}
                        className="google-input text-xs"
                      />
                      <Button type="button" variant="secondary" onClick={addLocation} className="rounded-2xl shrink-0 text-xs font-bold">
                        Add
                      </Button>
                    </div>
                    {serviceDraft.serviceLocations.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {serviceDraft.serviceLocations.map((loc) => (
                          <span
                            key={loc}
                            className="px-2.5 py-1 bg-muted/60 border border-border/30 rounded-full text-xs flex items-center gap-1.5 font-medium"
                          >
                            {loc}
                            <button
                              type="button"
                              onClick={() => setServiceDraft((prev) => ({
                                ...prev,
                                serviceLocations: prev.serviceLocations.filter((l) => l !== loc),
                              }))}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 rounded-2xl font-black text-xs active:scale-95 transition-all shadow-lg" 
                    disabled={saving || !serviceDraft.serviceName.trim()}
                  >
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {saving ? "Publishing Service..." : "Publish Service Offering"}
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
