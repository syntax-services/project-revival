import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness, useBusinessJobs } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase, Clock, CheckCircle, Play, XCircle, Eye, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

type JobStatus = "requested" | "quoted" | "accepted" | "ongoing" | "completed" | "cancelled" | "disputed";

const statusConfig: Record<JobStatus, { label: string; icon: typeof Clock; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  requested: { label: "Requested", icon: Clock, variant: "secondary" },
  quoted: { label: "Quote Sent", icon: Send, variant: "default" },
  accepted: { label: "Accepted", icon: CheckCircle, variant: "default" },
  ongoing: { label: "In Progress", icon: Play, variant: "default" },
  completed: { label: "Completed", icon: CheckCircle, variant: "default" },
  cancelled: { label: "Cancelled", icon: XCircle, variant: "destructive" },
  disputed: { label: "Disputed", icon: XCircle, variant: "destructive" },
};

export default function BusinessJobs() {
  const { data: business } = useBusiness();
  const { data: jobs = [], isLoading } = useBusinessJobs(business?.id);
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<typeof jobs[0] | null>(null);
  const [updating, setUpdating] = useState(false);
  const [quotePrice, setQuotePrice] = useState("");

  const updateJobStatus = async (jobId: string, newStatus: JobStatus, additionalData?: Record<string, unknown>) => {
    setUpdating(true);
    try {
      const updateData: Record<string, unknown> = { status: newStatus, ...additionalData };
      
      if (newStatus === "quoted") updateData.quoted_at = new Date().toISOString();
      if (newStatus === "accepted") updateData.accepted_at = new Date().toISOString();
      if (newStatus === "ongoing") updateData.started_at = new Date().toISOString();
      if (newStatus === "completed") updateData.completed_at = new Date().toISOString();
      if (newStatus === "cancelled") updateData.cancelled_at = new Date().toISOString();

      const { error } = await supabase
        .from("jobs")
        .update(updateData)
        .eq("id", jobId);

      if (error) throw error;
      
      toast.success(`Job status updated to ${statusConfig[newStatus].label}`);
      queryClient.invalidateQueries({ queryKey: ["business-jobs"] });
      setSelectedJob(null);
      setQuotePrice("");
    } catch (error) {
      toast.error("Failed to update job status");
    } finally {
      setUpdating(false);
    }
  };

  const sendQuote = () => {
    if (!selectedJob || !quotePrice) return;
    updateJobStatus(selectedJob.id, "quoted", { quoted_price: parseFloat(quotePrice) });
  };

  const filterJobs = (status: string) => {
    if (status === "all") return jobs;
    if (status === "active") return jobs.filter(j => ["requested", "quoted", "accepted", "ongoing"].includes(j.status));
    return jobs.filter(j => j.status === status);
  };

  const JobCard = ({ job }: { job: typeof jobs[0] }) => {
    const status = job.status as JobStatus;
    const config = statusConfig[status];
    const StatusIcon = config.icon;

    return (
      <div className="dashboard-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-foreground truncate">{job.title}</span>
              <Badge variant={config.variant} className="flex items-center gap-1 shrink-0">
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{job.job_number}</p>
            {job.budget_min && job.budget_max && (
              <p className="text-sm text-muted-foreground">
                Budget: ₦{Number(job.budget_min).toLocaleString()} - ₦{Number(job.budget_max).toLocaleString()}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(job.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedJob(job)}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Jobs</h1>
          <p className="mt-1 text-muted-foreground">Manage service requests and jobs</p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">All ({jobs.length})</TabsTrigger>
            <TabsTrigger value="requested">Requests ({filterJobs("requested").length})</TabsTrigger>
            <TabsTrigger value="active">Active ({filterJobs("active").length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({filterJobs("completed").length})</TabsTrigger>
          </TabsList>

          {["all", "requested", "active", "completed"].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="dashboard-card animate-pulse">
                      <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filterJobs(tab).length === 0 ? (
                <div className="dashboard-card text-center py-12">
                  <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-medium text-foreground">No jobs</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {tab === "requested" ? "No new job requests" : "Jobs will appear here"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filterJobs(tab).map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Dialog open={!!selectedJob} onOpenChange={() => { setSelectedJob(null); setQuotePrice(""); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedJob?.title}</DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={statusConfig[selectedJob.status as JobStatus].variant}>
                    {statusConfig[selectedJob.status as JobStatus].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Job Number</p>
                  <p className="font-medium">{selectedJob.job_number}</p>
                </div>
                {selectedJob.budget_min && (
                  <div>
                    <p className="text-muted-foreground">Customer Budget</p>
                    <p className="font-medium">
                      ₦{Number(selectedJob.budget_min).toLocaleString()} - ₦{Number(selectedJob.budget_max).toLocaleString()}
                    </p>
                  </div>
                )}
                {selectedJob.quoted_price && (
                  <div>
                    <p className="text-muted-foreground">Your Quote</p>
                    <p className="font-medium">₦{Number(selectedJob.quoted_price).toLocaleString()}</p>
                  </div>
                )}
                {selectedJob.location && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">{selectedJob.location}</p>
                  </div>
                )}
              </div>

              {selectedJob.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm">{selectedJob.description}</p>
                </div>
              )}

              {selectedJob.scheduled_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Scheduled</p>
                  <p className="text-sm font-medium">
                    {format(new Date(selectedJob.scheduled_date), "MMM d, yyyy")}
                    {selectedJob.scheduled_time && ` at ${selectedJob.scheduled_time}`}
                  </p>
                </div>
              )}

              {selectedJob.status === "requested" && (
                <div className="space-y-3 pt-2 border-t">
                  <div>
                    <Label htmlFor="quote">Send Quote</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="quote"
                        type="number"
                        placeholder="Enter your price"
                        value={quotePrice}
                        onChange={(e) => setQuotePrice(e.target.value)}
                      />
                      <Button onClick={sendQuote} disabled={!quotePrice || updating}>
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </Button>
                    </div>
                  </div>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => updateJobStatus(selectedJob.id, "cancelled")}
                    disabled={updating}
                  >
                    Decline Request
                  </Button>
                </div>
              )}

              {selectedJob.status === "accepted" && (
                <Button 
                  className="w-full"
                  onClick={() => updateJobStatus(selectedJob.id, "ongoing")}
                  disabled={updating}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Job
                </Button>
              )}

              {selectedJob.status === "ongoing" && (
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="finalPrice">Final Price</Label>
                    <Input
                      id="finalPrice"
                      type="number"
                      placeholder="Enter final price"
                      value={quotePrice}
                      onChange={(e) => setQuotePrice(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => updateJobStatus(selectedJob.id, "completed", { 
                      final_price: quotePrice ? parseFloat(quotePrice) : selectedJob.quoted_price 
                    })}
                    disabled={updating}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Completed
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
