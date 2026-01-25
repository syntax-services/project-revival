import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  ArrowLeft,
  Heart,
  Star,
  MessageCircle,
  MapPin,
  Briefcase,
  Globe,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Business {
  id: string;
  company_name: string;
  industry: string | null;
  business_location: string | null;
  products_services: string | null;
  website: string | null;
  cover_image_url: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  in_stock: boolean;
}

export default function BusinessPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      // Fetch business
      const { data: businessData } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", id)
        .single();

      if (businessData) {
        setBusiness(businessData);
      }

      // Fetch products
      const { data: productData } = await supabase
        .from("products")
        .select("*")
        .eq("business_id", id)
        .order("created_at", { ascending: false });

      if (productData) {
        setProducts(productData);
      }

      // Fetch likes count
      const { count } = await supabase
        .from("business_likes")
        .select("*", { count: "exact", head: true })
        .eq("business_id", id);

      setLikesCount(count || 0);

      // If logged in as customer, check saved/liked status
      if (user && profile?.user_type === "customer") {
        const { data: customer } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (customer) {
          setCustomerId(customer.id);

          // Check if saved
          const { data: saved } = await supabase
            .from("saved_businesses")
            .select("id")
            .eq("customer_id", customer.id)
            .eq("business_id", id)
            .maybeSingle();

          setIsSaved(!!saved);

          // Check if liked
          const { data: liked } = await supabase
            .from("business_likes")
            .select("id")
            .eq("customer_id", customer.id)
            .eq("business_id", id)
            .maybeSingle();

          setIsLiked(!!liked);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [id, user, profile]);

  const toggleSave = async () => {
    if (!customerId || !id) return;

    try {
      if (isSaved) {
        await supabase
          .from("saved_businesses")
          .delete()
          .eq("customer_id", customerId)
          .eq("business_id", id);
        setIsSaved(false);
        toast({ title: "Removed from favorites" });
      } else {
        await supabase.from("saved_businesses").insert({
          customer_id: customerId,
          business_id: id,
        });
        setIsSaved(true);
        toast({ title: "Saved to favorites" });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Action failed" });
    }
  };

  const toggleLike = async () => {
    if (!customerId || !id) return;

    try {
      if (isLiked) {
        await supabase
          .from("business_likes")
          .delete()
          .eq("customer_id", customerId)
          .eq("business_id", id);
        setIsLiked(false);
        setLikesCount((prev) => prev - 1);
      } else {
        await supabase.from("business_likes").insert({
          customer_id: customerId,
          business_id: id,
        });
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Action failed" });
    }
  };

  const startChat = async () => {
    if (!customerId || !id) {
      toast({
        variant: "destructive",
        title: "Please log in as a customer to message",
      });
      return;
    }

    try {
      // Check if conversation exists
      let { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("customer_id", customerId)
        .eq("business_id", id)
        .maybeSingle();

      if (!existingConv) {
        // Create new conversation
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({
            customer_id: customerId,
            business_id: id,
          })
          .select("id")
          .single();

        existingConv = newConv;
      }

      navigate("/customer/messages");
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to start chat" });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Business not found</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Cover Image */}
        <div className="relative h-48 md:h-64 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
          {business.cover_image_url ? (
            <img
              src={business.cover_image_url}
              alt={business.company_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-6xl font-bold text-primary/30">
                {business.company_name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Business Info */}
        <div className="dashboard-card">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {business.company_name}
              </h1>
              <div className="mt-2 space-y-1">
                {business.industry && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Briefcase className="h-4 w-4" />
                    <span>{business.industry}</span>
                  </div>
                )}
                {business.business_location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{business.business_location}</span>
                  </div>
                )}
                {business.website && (
                  <a
                    href={business.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    <span>{business.website}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Actions */}
            {profile?.user_type === "customer" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={toggleSave}
                  className="google-input-button"
                >
                  <Heart
                    className={cn(
                      "h-4 w-4 mr-2",
                      isSaved && "fill-pink-500 text-pink-500"
                    )}
                  />
                  {isSaved ? "Saved" : "Save"}
                </Button>
                <Button
                  variant="outline"
                  onClick={toggleLike}
                  className="google-input-button"
                >
                  <Star
                    className={cn(
                      "h-4 w-4 mr-2",
                      isLiked && "fill-yellow-500 text-yellow-500"
                    )}
                  />
                  {likesCount}
                </Button>
                <Button onClick={startChat} className="google-input-button">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </div>
            )}
          </div>

          {business.products_services && (
            <div className="mt-6 pt-6 border-t border-border">
              <h2 className="font-medium text-foreground mb-2">About</h2>
              <p className="text-muted-foreground">{business.products_services}</p>
            </div>
          )}
        </div>

        {/* Products */}
        {products.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Products & Services
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <div key={product.id} className="dashboard-card">
                  {product.image_url && (
                    <div className="relative -mx-5 -mt-5 mb-4 h-40 overflow-hidden rounded-t-lg">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <h3 className="font-medium text-foreground">{product.name}</h3>
                  {product.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    {product.price && (
                      <span className="font-semibold text-primary">
                        ${product.price.toFixed(2)}
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        product.in_stock
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {product.in_stock ? "In Stock" : "Out of Stock"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
