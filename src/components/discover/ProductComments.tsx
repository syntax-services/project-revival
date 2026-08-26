import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, User as UserIcon, ShieldCheck, CheckCircle2 } from "lucide-react";
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
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "verified">("all");

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
          reviewer_type,
          parent_id,
          verified_purchase
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
          verified_purchase: true,
          parent_id: replyTo
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment("");
      setReplyTo(null);
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
    <div className="flex flex-col space-y-4 text-left font-sans">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Reviews
        </h3>
        <div className="flex bg-muted/30 p-0.5 rounded-full border border-border/20">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 text-[10px] rounded-full transition-colors ${filter === "all" ? "bg-background shadow-sm font-medium text-foreground" : "text-muted-foreground"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("verified")}
            className={`px-3 py-1 text-[10px] rounded-full transition-colors ${filter === "verified" ? "bg-background shadow-sm font-medium text-foreground" : "text-muted-foreground"}`}
          >
            Verified Purchases
          </button>
        </div>
      </div>
      
      <div className="space-y-1">
        {isLoading ? (
          <div className="text-xs text-muted-foreground animate-pulse font-light py-4">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-xs text-muted-foreground italic py-6 text-center font-light border-y border-border/10">
            No reviews yet. Be the first to ask or review!
          </div>
        ) : (
          (() => {
            const rootComments = comments.filter((c: any) => !c.parent_id);
            const filteredComments = filter === "verified" ? rootComments.filter((c: any) => c.verified_purchase) : rootComments;

            const repliesByParent = comments.reduce((acc: any, c: any) => {
              if (c.parent_id) {
                if (!acc[c.parent_id]) acc[c.parent_id] = [];
                acc[c.parent_id].push(c);
              }
              return acc;
            }, {});

            const renderComment = (comment: any, isReply = false) => (
              <div key={comment.id} className={`flex gap-3 items-start py-3 ${isReply ? 'ml-8 mt-1 border-none' : 'border-b border-border/10'}`}>
                <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center shrink-0 overflow-hidden">
                  {comment.profile?.avatar_url ? (
                    <img src={getMaskedAssetUrl(comment.profile.avatar_url)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-primary/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground truncate">
                      {comment.profile?.full_name || "User"}
                    </span>
                    {comment.verified_purchase && (
                      <span className="flex items-center gap-0.5 text-[9px] text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-full font-medium">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Verified Purchase
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0 font-light">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/80 mt-1 leading-relaxed font-light">
                    {comment.content}
                  </p>
                  {!isReply && user && (
                    <button 
                      onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                      className="text-[10px] text-muted-foreground mt-1 hover:text-foreground transition-colors"
                    >
                      {replyTo === comment.id ? 'Cancel Reply' : 'Reply'}
                    </button>
                  )}
                  {repliesByParent[comment.id]?.map((reply: any) => renderComment(reply, true))}
                </div>
              </div>
            );

            return filteredComments.length === 0 ? (
               <div className="text-xs text-muted-foreground italic py-6 text-center font-light border-y border-border/10">
                 No {filter === "verified" ? "verified " : ""}reviews yet.
               </div>
            ) : filteredComments.map((c: any) => renderComment(c));
          })()
        )}
      </div>

      {user && (
        <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyTo ? "Write a reply..." : "Ask a question or leave a review..."}
            className="google-input text-xs font-light h-10 rounded-xl"
            disabled={postCommentMutation.isPending}
          />
          <Button 
            type="submit" 
            size="sm" 
            disabled={!newComment.trim() || postCommentMutation.isPending}
            className="rounded-xl shrink-0 text-xs font-medium h-10 px-4"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" /> Post
          </Button>
        </form>
      )}
    </div>
  );
}

