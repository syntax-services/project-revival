import { RareBadgeIcon } from "@/components/ui/RareBadgeIcon";
import { useState, useEffect } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Link } from "react-router-dom";
import { optimizeImage } from "@/lib/imageOptimizer";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/ui/tag-input";
import { Plus, Pencil, Trash2, Package, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness, useBusinessProducts } from "@/hooks/useBusiness";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  compare_at_price: number | null;
  image_url: string | null;
  in_stock: boolean;
  is_rare: boolean;
  commission_percent: number | null;
  tags: string[] | null;
  is_orderable?: boolean;
}

export default function BusinessProducts() {
  usePageMeta({
    title: "Manage Products & Inventory",
    description: "Add, edit, and organize your product catalogue, pricing, inventory stock, and rare item tags.",
    keywords: ["manage products","inventory","stock management"],
    });

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("10.0");
  const [isRare, setIsRare] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [inStock, setInStock] = useState(true);
  const [isOrderable, setIsOrderable] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Fetch business ID
  const { data: business } = useBusiness();

  // Fetch products
  const { data: products = [], isLoading } = useBusinessProducts(business?.id);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setCompareAtPrice("");
    setCommissionPercent("10.0");
    setIsRare(false);
    setTags([]);
    setInStock(true);
    setIsOrderable(true);
    setImageUrl(null);
    setImageFile(null);
    setEditingProduct(null);
    localStorage.removeItem("string_products_manager_draft");
  };

  useEffect(() => {
    if (!editingProduct && isDialogOpen) {
      const hasContent = name || description || price || tags.length > 0;
      if (hasContent) {
        localStorage.setItem("string_products_manager_draft", JSON.stringify({
          name, description, price, compareAtPrice, commissionPercent, isRare, tags, inStock, isOrderable, imageUrl
        }));
      }
    }
  }, [editingProduct, isDialogOpen, name, description, price, compareAtPrice, commissionPercent, isRare, tags, inStock, isOrderable, imageUrl]);

  const openDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setName(product.name);
      setDescription(product.description || "");
      setPrice(product.price?.toString() || "");
      setCompareAtPrice(product.compare_at_price?.toString() || "");
      setCommissionPercent(product.commission_percent?.toString() || "10.0");
      setIsRare(product.is_rare || false);
      setTags(product.tags || []);
      setInStock(product.in_stock);
      setIsOrderable(product.is_orderable ?? true);
      setImageUrl(product.image_url);
    } else {
      setEditingProduct(null);
      try {
        const saved = localStorage.getItem("string_products_manager_draft");
        if (saved) {
          const parsed = JSON.parse(saved);
          setName(parsed.name || "");
          setDescription(parsed.description || "");
          setPrice(parsed.price || "");
          setCompareAtPrice(parsed.compareAtPrice || "");
          setCommissionPercent(parsed.commissionPercent || "10.0");
          setIsRare(!!parsed.isRare);
          setTags(parsed.tags || []);
          setInStock(parsed.inStock ?? true);
          setIsOrderable(parsed.isOrderable ?? true);
          setImageUrl(parsed.imageUrl || null);
        } else {
          resetForm();
        }
      } catch {
        resetForm();
      }
    }
    setIsDialogOpen(true);
  };


  const uploadImage = async (file: File): Promise<string | null> => {
    const optimizedFile = await optimizeImage(file);
    const fileExt = optimizedFile.name.split(".").pop();
    const fileName = `${business?.id}/products/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, optimizedFile);

    if (uploadError) {
      console.error("Supabase Upload Error: ", uploadError);
      toast.error(`Failed to upload image: ${uploadError.message}`);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const activeBusinessId = business?.id || user?.id;
      if (!activeBusinessId) {
        throw new Error("Please log in to continue.");
      }

      let finalImageUrl = imageUrl;

      if (imageFile) {
        setUploading(true);
        try {
          finalImageUrl = await uploadImage(imageFile);
        } finally {
          setUploading(false);
        }
      }

      const cleanPrice = price ? parseFloat(price.toString().replace(/,/g, '').trim()) : null;
      const validPrice = cleanPrice !== null && !isNaN(cleanPrice) ? Math.min(Math.max(0, cleanPrice), 999999999) : null;

      const cleanCompare = compareAtPrice ? parseFloat(compareAtPrice.toString().replace(/,/g, '').trim()) : null;
      const validCompare = cleanCompare !== null && !isNaN(cleanCompare) ? Math.min(Math.max(0, cleanCompare), 999999999) : null;

      const cleanComm = commissionPercent ? parseFloat(commissionPercent.toString().replace(/,/g, '').trim()) : 10.0;
      const validComm = !isNaN(cleanComm) ? Math.min(Math.max(1, cleanComm), 99.99) : 10.0;

      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        price: validPrice,
        compare_at_price: validCompare,
        commission_percent: validComm,
        is_rare: isRare,
        tags: tags.length > 0 ? tags : null,
        in_stock: inStock,
        image_url: finalImageUrl,
        business_id: activeBusinessId,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(productData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(editingProduct ? "Product updated!" : "Product added!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save product");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted");
    },
    onError: () => {
      toast.error("Failed to delete product");
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 pb-24 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-muted-foreground">Manage what you offer to customers</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/business/upload">
              <Button variant="outline" className="gap-2 rounded-2xl text-xs font-bold">
                <Plus className="h-4 w-4" /> Full Catalog Upload (3–7 Photos)
              </Button>
            </Link>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openDialog()} className="gap-2 rounded-2xl text-xs font-bold">
                  <Plus className="h-4 w-4" /> Quick Add
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Product" : "Add New Product"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>Product Image</Label>
                  <div
                    className="relative border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:border-foreground/50 transition-colors"
                    onClick={() => document.getElementById("product-image")?.click()}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Product preview"
                        className="w-full h-40 object-cover rounded-xl"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ImageIcon className="h-10 w-10" />
                        <span>Click to upload image</span>
                      </div>
                    )}
                    <input
                      id="product-image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Classic Burger"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label>Tags / Keywords</Label>
                  <TagInput
                    value={tags}
                    onChange={setTags}
                    placeholder="Add tag..."
                    maxTags={10}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your product..."
                    rows={3}
                  />
                </div>

                {/* Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₦) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="compare-at">Compare At (₦)</Label>
                    <Input
                      id="compare-at"
                      type="number"
                      step="0.01"
                      min="0"
                      value={compareAtPrice}
                      onChange={(e) => setCompareAtPrice(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commission">Commission (%)</Label>
                  <Input
                    id="commission"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">Standard platform fee: 10%</p>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center justify-between border rounded-lg p-3">
                    <Label htmlFor="in-stock" className="text-sm">In Stock</Label>
                    <Switch
                      id="in-stock"
                      checked={inStock}
                      onCheckedChange={setInStock}
                    />
                  </div>
                  <div className="flex items-center justify-between border rounded-lg p-3">
                    <Label htmlFor="is-rare" className="text-sm">Rare Item</Label>
                    <Switch
                      id="is-rare"
                      checked={isRare}
                      onCheckedChange={setIsRare}
                    />
                  </div>
                  <div className="flex items-center justify-between border rounded-lg p-3 col-span-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="is-orderable" className="text-sm">Orderable Product</Label>
                      <p className="text-[10px] text-muted-foreground">Allows customers to add this product to their cart.</p>
                    </div>
                    <Switch
                      id="is-orderable"
                      checked={isOrderable}
                      onCheckedChange={setIsOrderable}
                    />
                  </div>
                </div>

                {/* Save Button */}
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={!name.trim() || saveMutation.isPending || uploading}
                  className="w-full"
                >
                  {(saveMutation.isPending || uploading) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingProduct ? "Update Product" : "Add Product"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : products?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No products yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first product to showcase to customers
              </p>
              <Button onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products?.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                {product.image_url ? (
                  <div className="aspect-video w-full overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-muted flex items-center justify-center">
                    <Package className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg truncate">{product.name}</CardTitle>
                        {product.is_rare && (
                          <div title="Rare Product" className="flex items-center justify-center">
                            <RareBadgeIcon className="h-5 w-5 text-amber-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold text-primary">
                         <p className="font-medium">{'\u20A6'}{product.price?.toLocaleString()}</p>
                        </span>
                        {product.compare_at_price && (
                          <span className="text-xs text-muted-foreground line-through">
                            ₦{Number(product.compare_at_price).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {product.tags && product.tags.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">
                          {product.tags.join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0 px-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openDialog(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the product "{product.name}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(product.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    {product.price !== null && (
                      <span className="font-semibold">
                        ₦{product.price.toLocaleString()}
                      </span>
                    )}
                    <div className="flex gap-2">
                      {!product.is_orderable && (
                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground border border-border/50">
                          Non-orderable
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${product.in_stock
                          ? "bg-foreground/10 text-foreground"
                          : "bg-muted text-muted-foreground"
                          }`}
                      >
                        {product.in_stock ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
