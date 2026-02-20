import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  in_stock: boolean;
  tags: string[] | null;
}

export default function BusinessProducts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [inStock, setInStock] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Fetch business ID
  const { data: business } = useQuery({
    queryKey: ["business", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch products
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, price, image_url, in_stock, tags")
        .eq("business_id", business?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!business?.id,
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice("");
    setTags([]);
    setInStock(true);
    setImageUrl(null);
    setImageFile(null);
    setEditingProduct(null);
  };

  const openDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setName(product.name);
      setDescription(product.description || "");
      setPrice(product.price?.toString() || "");
      setTags(product.tags || []);
      setInStock(product.in_stock);
      setImageUrl(product.image_url);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${business?.id}/products/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, file);

    if (uploadError) {
      toast.error("Failed to upload image");
      return null;
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let finalImageUrl = imageUrl;

      if (imageFile) {
        setUploading(true);
        finalImageUrl = await uploadImage(imageFile);
        setUploading(false);
      }

      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        price: price ? parseFloat(price) : null,
        tags: tags.length > 0 ? tags : null,
        in_stock: inStock,
        image_url: finalImageUrl,
        business_id: business?.id,
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
      queryClient.invalidateQueries({ queryKey: ["products", business?.id] });
      toast.success(editingProduct ? "Product updated!" : "Product added!");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error("Failed to save product");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", business?.id] });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage what you offer to customers</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
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
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
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

              {/* In Stock Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="in-stock">Available / In Stock</Label>
                <Switch
                  id="in-stock"
                  checked={inStock}
                  onCheckedChange={setInStock}
                />
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
                    <CardTitle className="text-lg truncate">{product.name}</CardTitle>
                    {product.tags && product.tags.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {product.tags.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openDialog(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      product.in_stock
                        ? "bg-foreground/10 text-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {product.in_stock ? "In Stock" : "Out of Stock"}
                  </span>
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