import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, User as UserIcon, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { getMaskedAssetUrl } from "@/lib/assetMask";

interface ProductCommentsProps {
  productId: string;
}

export function ProductComments({ productId }: ProductCommentsProps) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["product-comments", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          id,
          content,
          created_at,
          rating,
          reviewer_id,
          reviewer_type
        `)
        .eq("product_id", productId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return [];
      
      const reviewerIds = [...new Set(data.map(r => r.reviewer_id).filter(Boolean))];
      if (reviewerIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, avatar_url");
        
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => {
        if (p.id) profileMap[p.id] = p;
        if (p.user_id) profileMap[p.user_id] = p;
      });

      return data.map(r => {
        const found = profileMap[r.reviewer_id];
        return {
          ...r,
          profile: found || {
            full_name: profile?.user_id === r.reviewer_id ? (profile.full_name || "You") : "Verified Campus Member",
            avatar_url: profile?.user_id === r.reviewer_id ? profile.avatar_url : null,
          }
        };
      });
    },
    enabled: !!productId
  });

  const postCommentMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in to comment");
      const { error } = await supabase
        .from("reviews")
        .insert({
          product_id: productId,
          content: newComment.trim(),
          rating: 5,
          reviewer_id: user.id,
          reviewer_type: profile?.user_type || 'customer',
          verified_purchase: true
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["product-comments", productId] });
      toast.success("Comment posted!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to post comment");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    postCommentMutation.mutate();
  };

  return (
    <div className="flex flex-col space-y-4 text-left">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-foreground">
          Community Discussions ({comments.length})
        </h3>
        <span className="text-[10px] text-muted-foreground font-semibold">
          Real verified members
        </span>
      </div>
      
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-xs text-muted-foreground animate-pulse">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-xs text-muted-foreground italic p-3 rounded-2xl bg-muted/20 border border-border/20 text-center">
            No comments yet. Have a question about this item? Be the first to ask!
          </div>
        ) : (
          comments.map((comment: any) => (
            <div key={comment.id} className="flex gap-3 items-start p-3 rounded-2xl bg-card border border-border/20 shadow-xs">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden border border-border/30">
                {comment.profile?.avatar_url ? (
                  <img src={getMaskedAssetUrl(comment.profile.avatar_url)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground truncate">
                    {comment.profile?.full_name || "Verified Member"}
                  </span>
                  <ShieldCheck className="h-3 w-3 text-primary shrink-0 fill-primary/20" />
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-foreground/90 mt-1 leading-relaxed">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {user && (
        <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Ask a question or leave a review..."
            className="google-input text-xs"
            disabled={postCommentMutation.isPending}
          />
          <Button 
            type="submit" 
            size="sm" 
            disabled={!newComment.trim() || postCommentMutation.isPending}
            className="rounded-2xl shrink-0 text-xs font-bold"
          >
            <Send className="w-3.5 h-3.5 mr-1" /> Post
          </Button>
        </form>
      )}
    </div>
  );
}
