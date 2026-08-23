import { useState, useEffect } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCustomer } from "@/hooks/useCustomer";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Heart, Bookmark, Store, Package, Trash2, ArrowLeft, 
  Loader2, ShoppingBag, ShieldCheck, ArrowUpRight 
} from "lucide-react";
import { getMaskedAssetUrl } from "@/lib/assetMask";

interface SavedProductItem {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  category: string | null;
  isService?: boolean;
  business: {
    id: string;
    company_name: string;
    logo_url: string | null;
    verified: boolean | null;
  };
}

export default function CustomerSavedBusinesses() {
  usePageMeta({
    title: "Saved Stores & Favorite Merchants",
    description: "Quick access to your bookmarked businesses and subscribed campus storefronts.",
    keywords: ["saved stores","favorite merchants","wishlist"],
    });

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: customer } = useCustomer();

  const [activeTab, setActiveTab] = useState<"saved-items" | "liked-items" | "followed-stores">("saved-items");
  
  // Specific item IDs from local storage / sync
  const [savedItemIds, setSavedItemIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("string_user_saved_bookmarks") || "[]");
    } catch {
      return [];
    }
  });

  const [likedItemIds, setLikedItemIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("string_user_liked_items") || "[]");
    } catch {
      return [];
    }
  });

  const [savedProducts, setSavedProducts] = useState<SavedProductItem[]>([]);
  const [likedProducts, setLikedProducts] = useState<SavedProductItem[]>([]);
  const [followedStores, setFollowedStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        // 1. Fetch saved products
        if (savedItemIds.length > 0) {
          const { data: prods } = await supabase
            .from("products")
            .select(`
              id, name, price, image_url, category,
              businesses!inner(id, company_name, logo_url, verified)
            `)
            .in("id", savedItemIds);

          if (prods) {
            setSavedProducts(prods.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              image_url: p.image_url,
              category: p.category,
              isService: false,
              business: p.businesses,
            })));
          }
        } else {
          setSavedProducts([]);
        }

        // 2. Fetch liked products
        if (likedItemIds.length > 0) {
          const { data: likedProds } = await supabase
            .from("products")
            .select(`
              id, name, price, image_url, category,
              businesses!inner(id, company_name, logo_url, verified)
            `)
            .in("id", likedItemIds);

          if (likedProds) {
            setLikedProducts(likedProds.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: p.price,
              image_url: p.image_url,
              category: p.category,
              isService: false,
              business: p.businesses,
            })));
          }
        } else {
          setLikedProducts([]);
        }

        // 3. Fetch followed stores
        if (customer?.id) {
          const { data: follows } = await supabase
            .from("saved_businesses")
            .select(`
              id, business_id,
              businesses(id, company_name, cover_image_url, logo_url, verified, verification_tier, business_location)
            `)
            .eq("customer_id", customer.id);

          if (follows) setFollowedStores(follows);
        }
      } catch (err) {
        console.warn("Error fetching saved items:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [savedItemIds, likedItemIds, customer?.id]);

  const handleRemoveSaved = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedItemIds.filter((id) => id !== itemId);
    setSavedItemIds(updated);
    setSavedProducts((prev) => prev.filter((p) => p.id !== itemId));
    localStorage.setItem("string_user_saved_bookmarks", JSON.stringify(updated));
    toast.success("Removed from bookmarks");
  };

  const handleRemoveLiked = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = likedItemIds.filter((id) => id !== itemId);
    setLikedItemIds(updated);
    setLikedProducts((prev) => prev.filter((p) => p.id !== itemId));
    localStorage.setItem("string_user_liked_items", JSON.stringify(updated));
    toast.success("Removed from liked items");
  };

  const handleUnfollowStore = async (savedId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase.from("saved_businesses").delete().eq("id", savedId);
      setFollowedStores((prev) => prev.filter((s) => s.id !== savedId));
      toast.success("Unfollowed store");
    } catch {
      toast.error("Failed to unfollow store");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-20 pt-2 text-left">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-primary" />
              Saved & Liked Items
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your private collection of bookmarked goods and liked campus posts
            </p>
          </div>

          <Button onClick={() => navigate("/customer/discover")} variant="outline" size="sm" className="rounded-2xl text-xs font-bold gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Explore Catalog
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
          <TabsList className="grid w-full grid-cols-3 rounded-2xl h-11 bg-muted/40 p-1 border border-border/20">
            <TabsTrigger value="saved-items" className="text-xs font-bold rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Bookmark className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Saved Items ({savedProducts.length})
            </TabsTrigger>
            <TabsTrigger value="liked-items" className="text-xs font-bold rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Heart className="h-3.5 w-3.5 mr-1.5 text-red-500" />
              Liked ({likedProducts.length})
            </TabsTrigger>
            <TabsTrigger value="followed-stores" className="text-xs font-bold rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Store className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Stores ({followedStores.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: SAVED ITEMS */}
          <TabsContent value="saved-items" className="mt-4 space-y-4">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : savedProducts.length === 0 ? (
              <div className="text-center py-16 bg-card/40 rounded-3xl border border-border/20 p-8 space-y-3">
                <Bookmark className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
                <h3 className="font-bold text-sm text-foreground">No saved items yet</h3>
                <p className="text-xs text-muted-foreground">Click the bookmark icon on any product in the feed to save it here.</p>
                <Button onClick={() => navigate("/customer/discover")} variant="secondary" className="rounded-2xl text-xs font-bold">
                  Browse Products
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {savedProducts.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => navigate(`/product/${prod.id}`)}
                    className="group bg-card rounded-2xl overflow-hidden border border-border/20 hover:border-primary/40 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col"
                  >
                    <div className="relative aspect-video w-full bg-muted/20 overflow-hidden">
                      {prod.image_url ? (
                        <img src={getMaskedAssetUrl(prod.image_url)} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground font-semibold">No Image</div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleRemoveSaved(prod.id, e)}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-destructive text-white p-1.5 rounded-full shadow-md transition-colors"
                        title="Remove bookmark"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <h3 className="font-bold text-xs text-foreground truncate">{prod.name}</h3>
                        <p className="font-black text-sm text-primary mt-0.5">
                          ₦{(prod.price || 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/10 text-[10px] text-muted-foreground">
                        <span className="truncate font-semibold flex items-center gap-1">
                          <Store className="h-3 w-3" /> {prod.business?.company_name}
                        </span>
                        <span className="text-primary font-bold flex items-center">View <ArrowUpRight className="h-3 w-3 ml-0.5" /></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: LIKED ITEMS */}
          <TabsContent value="liked-items" className="mt-4 space-y-4">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : likedProducts.length === 0 ? (
              <div className="text-center py-16 bg-card/40 rounded-3xl border border-border/20 p-8 space-y-3">
                <Heart className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
                <h3 className="font-bold text-sm text-foreground">No liked items yet</h3>
                <p className="text-xs text-muted-foreground">Heart your favorite products from the feed to keep track of them privately.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {likedProducts.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => navigate(`/product/${prod.id}`)}
                    className="group bg-card rounded-2xl overflow-hidden border border-border/20 hover:border-primary/40 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col"
                  >
                    <div className="relative aspect-video w-full bg-muted/20 overflow-hidden">
                      {prod.image_url ? (
                        <img src={getMaskedAssetUrl(prod.image_url)} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground font-semibold">No Image</div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleRemoveLiked(prod.id, e)}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-destructive text-white p-1.5 rounded-full shadow-md transition-colors"
                        title="Remove from liked"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <h3 className="font-bold text-xs text-foreground truncate">{prod.name}</h3>
                        <p className="font-black text-sm text-primary mt-0.5">
                          ₦{(prod.price || 0).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/10 text-[10px] text-muted-foreground">
                        <span className="truncate font-semibold flex items-center gap-1">
                          <Store className="h-3 w-3" /> {prod.business?.company_name}
                        </span>
                        <span className="text-primary font-bold flex items-center">View <ArrowUpRight className="h-3 w-3 ml-0.5" /></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: FOLLOWED STORES */}
          <TabsContent value="followed-stores" className="mt-4 space-y-4">
            {followedStores.length === 0 ? (
              <div className="text-center py-16 bg-card/40 rounded-3xl border border-border/20 p-8 space-y-3">
                <Store className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
                <h3 className="font-bold text-sm text-foreground">No followed stores</h3>
                <p className="text-xs text-muted-foreground">Follow merchants from the Discover feed to get quick access to their storefronts.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {followedStores.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/business/${item.business_id}`)}
                    className="p-4 rounded-2xl bg-card border border-border/20 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden border border-border/30 shrink-0">
                        {item.businesses?.logo_url ? (
                          <img src={getMaskedAssetUrl(item.businesses.logo_url)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Store className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-foreground truncate flex items-center gap-1">
                          {item.businesses?.company_name}
                          {item.businesses?.verified && <ShieldCheck className="h-3 w-3 text-primary shrink-0" />}
                        </p>
                        {item.businesses?.business_location && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {item.businesses.business_location}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleUnfollowStore(item.id, e)}
                      className="rounded-full text-muted-foreground hover:text-destructive shrink-0"
                      title="Unfollow store"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
