/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { InterlockingLoader } from "@/components/ui/interlocking-loader";

interface AdminFeedbacksTabProps {
  feedbacks: any[];
  loadingFeedbacks: boolean;
  refetchFeedbacks: () => void;
}

export function AdminFeedbacksTab({
  feedbacks,
  loadingFeedbacks,
  refetchFeedbacks,
}: AdminFeedbacksTabProps) {
  // Feedback update mutation
  const updateFeedbackMutation = useMutation({
    mutationFn: async ({ feedbackId, status, notes }: { feedbackId: string; status: string; notes?: string }) => {
      const updates: any = { status };
      if (notes !== undefined) updates.admin_notes = notes;
      
      const { error } = await supabase
        .from("user_feedbacks")
        .update(updates)
        .eq("id", feedbackId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback updated successfully! ");
      refetchFeedbacks();
    },
    onError: (err: any) => {
      toast.error("Failed to update feedback: " + err.message);
    }
  });

  // Delete feedback mutation
  const deleteFeedbackMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      const { error } = await supabase
        .from("user_feedbacks")
        .delete()
        .eq("id", feedbackId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback deleted successfully! ");
      refetchFeedbacks();
    },
    onError: (err: any) => {
      toast.error("Failed to delete feedback: " + err.message);
    }
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Platform User Feedbacks ({feedbacks.length})</CardTitle>
            <CardDescription>Review and manage direct feedback from platform users</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchFeedbacks()} className="h-8 border-primary/20 hover:bg-primary/5">
            <Loader2 className={`h-3 w-3 mr-1 ${loadingFeedbacks ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loadingFeedbacks ? (
            <div className="flex items-center justify-center py-12">
              <InterlockingLoader size="sm" label="Loading feedbacks..." />
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground font-semibold">
              No platform feedback received yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {feedbacks.map((f: any) => (
                <div key={f.id} className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-4 space-y-3 shadow-sm text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{f.profiles?.full_name || "Unknown"}</p>
                      <p className="text-[10px] text-muted-foreground">{f.profiles?.email} • {f.profiles?.user_type}</p>
                    </div>
                    <Badge variant={f.status === 'resolved' ? 'default' : f.status === 'in_progress' ? 'secondary' : 'destructive'}>
                      {f.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-500 font-bold text-sm">{"".repeat(f.rating)}</span>
                      <span className="font-bold text-xs text-foreground/80">{f.subject}</span>
                    </div>
                    <p className="text-xs text-muted-foreground bg-muted/10 p-2.5 rounded-xl leading-relaxed">
                      {f.message}
                    </p>
                  </div>

                  {/* Admin Action Space */}
                  <div className="space-y-2 pt-1 border-t border-border/20">
                    <div className="flex gap-2 items-center">
                      <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground shrink-0">Configure Status:</Label>
                      <Select
                        value={f.status}
                        onValueChange={(val) => updateFeedbackMutation.mutate({ feedbackId: f.id, status: val })}
                      >
                        <SelectTrigger className="h-7 text-xs bg-muted/20 border-border/40 rounded-lg max-w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="ignored">Ignored</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add private admin notes..."
                        defaultValue={f.admin_notes || ""}
                        onBlur={(e) => {
                          if (e.target.value !== (f.admin_notes || "")) {
                            updateFeedbackMutation.mutate({ feedbackId: f.id, status: f.status, notes: e.target.value });
                          }
                        }}
                        className="h-8 text-xs bg-muted/20 border-border/40 rounded-lg flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Delete feedback permanently? This action is irreversible.")) {
                            deleteFeedbackMutation.mutate(f.id);
                          }
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
