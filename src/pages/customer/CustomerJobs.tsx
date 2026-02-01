import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useCustomer, useCustomerJobs } from "@/hooks/useCustomer";
import { Briefcase, Clock, CheckCircle, Play, XCircle, Eye, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type JobStatus = "requested" | "quoted" | "accepted" | "rejected" | "ongoing" | "completed" | "cancelled" | "disputed";

const statusConfig: Record<JobStatus, { label: string; icon: typeof Clock; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  requested: { label: "Requested", icon: Clock, variant: "secondary" },
  quoted: { label: "Quote Received", icon: Send, variant: "default" },
  accepted: { label: "Accepted", icon: CheckCircle, variant: "default" },
  rejected: { label: "Rejected", icon: XCircle, variant: "destructive" },
  ongoing: { label: "In Progress", icon: Play, variant: "default" },
  completed: { label: "Completed", icon: CheckCircle, variant: "default" },
  cancelled: { label: "Cancelled", icon: XCircle, variant: "destructive" },
  disputed: { label: "Disputed", icon: XCircle, variant: "destructive" },
};

export default function CustomerJobs() {
  const { data: customer } = useCustomer();
  const { data: jobs = [], isLoading } = useCustomerJobs(customer?.id);
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<typeof jobs[0] | null>(null);
  const [updating, setUpdating] = useState(false);

  const acceptQuote = async (jobId: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("jobs")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", jobId);

      if (error) throw error;
      toast.success("Quote accepted!");
      queryClient.invalidateQueries({ queryKey: ["customer-jobs"] });
      setSelectedJob(null);
    } catch (error) {
      toast.error("Failed to accept quote");
    } finally {
      setUpdating(false);
    }
  };

  const cancelJob = async (jobId: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("jobs")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", jobId);

      if (error) throw error;
      toast.success("Job cancelled");
      queryClient.invalidateQueries({ queryKey: ["customer-jobs"] });
      setSelectedJob(null);
    } catch (error) {
      toast.error("Failed to cancel job");
    } finally {
      setUpdating(false);
    }
  };

  const filterJobs = (status: string) => {
    if (status === "all") return jobs;
    if (status === "active") return jobs.filter(j => ["requested", "quoted", "accepted", "ongoing"].includes(j.status));
    if (status === "completed") return jobs.filter(j => j.status === "completed");
    return jobs.filter(j => j.status === status);
  };

  const JobCard = ({ job }: { job: typeof jobs[0] }) => {
    const status = job.status as JobStatus;
    const config = statusConfig[status] || statusConfig.requested;
    const StatusIcon = config.icon;

    return (
      <div className="dashboard-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-foreground truncate">
                {job.services?.name || "Service Request"}
              </span>
              <Badge variant={config.variant} className="flex items-center gap-1 shrink-0">
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {job.businesses?.company_name} • #{job.id.slice(0, 8)}
            </p>
            {job.quoted_price && job.status !== "requested" && (
              <p className="text-sm font-medium text-foreground mt-1">
                Quote: ₦{Number(job.quoted_price).toLocaleString()}
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
          <h1 className="text-2xl font-semibold text-foreground">My Jobs</h1>
          <p className="mt-1 text-muted-foreground">Track your service requests</p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">All ({jobs.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({filterJobs("active").length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({filterJobs("completed").length})</TabsTrigger>
          </TabsList>

          {["all", "active", "completed"].map((tab) => (
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
                    Your service requests will appear here
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

      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Job Details</DialogTitle>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-foreground">
                  {selectedJob.services?.name || "Service Request"}
                </h3>
                <p className="text-sm text-muted-foreground">{selectedJob.businesses?.company_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={statusConfig[selectedJob.status as JobStatus]?.variant || "secondary"}>
                    {statusConfig[selectedJob.status as JobStatus]?.label || selectedJob.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Job ID</p>
                  <p className="font-medium">#{selectedJob.id.slice(0, 8)}</p>
                </div>
                {selectedJob.quoted_price && (
                  <div>
                    <p className="text-muted-foreground">Provider's Quote</p>
                    <p className="font-medium">₦{Number(selectedJob.quoted_price).toLocaleString()}</p>
                  </div>
                )}
                {selectedJob.final_price && (
                  <div>
                    <p className="text-muted-foreground">Final Price</p>
                    <p className="font-medium">₦{Number(selectedJob.final_price).toLocaleString()}</p>
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

              {selectedJob.status === "quoted" && (
                <div className="flex gap-3 pt-2 border-t">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => cancelJob(selectedJob.id)}
                    disabled={updating}
                  >
                    Decline
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => acceptQuote(selectedJob.id)}
                    disabled={updating}
                  >
                    Accept Quote
                  </Button>
                </div>
              )}

              {["requested", "accepted"].includes(selectedJob.status) && (
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={() => cancelJob(selectedJob.id)}
                  disabled={updating}
                >
                  Cancel Job
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}