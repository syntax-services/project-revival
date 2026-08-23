import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Users, Building2, Crown, ShieldCheck, Mail, Loader2, Paperclip, X } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export function AdminBroadcastTab() {
  const [recipientType, setRecipientType] = useState("all");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [attachments, setAttachments] = useState<{ filename: string; content: string }[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      
      files.forEach((file) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const base64String = (reader.result as string).split(",")[1];
          setAttachments((prev) => [...prev, { filename: file.name, content: base64String }]);
        };
      });
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Fetch all profiles so we can filter locally and show counts
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-all-profiles-emails"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("email, user_type, user_id");
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch businesses for premium/verified filters
  const { data: businesses = [] } = useQuery({
    queryKey: ["admin-all-businesses-meta"],
    queryFn: async () => {
      const { data, error } = await supabase.from("businesses").select("user_id, verification_tier, location_verified");
      if (error) throw error;
      return data || [];
    }
  });

  const getTargetEmails = () => {
    let targeted = [...profiles];

    switch (recipientType) {
      case "businesses":
        targeted = targeted.filter(p => p.user_type === "business");
        break;
      case "customers":
        targeted = targeted.filter(p => p.user_type === "customer");
        break;
      case "boosted":
        const boostedUserIds = new Set(businesses.filter(b => b.verification_tier === 'premium').map(b => b.user_id));
        targeted = targeted.filter(p => boostedUserIds.has(p.user_id));
        break;
      case "verified":
        const verifiedUserIds = new Set(businesses.filter(b => b.location_verified).map(b => b.user_id));
        targeted = targeted.filter(p => verifiedUserIds.has(p.user_id));
        break;
    }

    // Filter out duplicates and empty emails just in case
    const uniqueEmails = Array.from(new Set(targeted.map(p => p.email).filter(Boolean)));
    return uniqueEmails;
  };

  const targetEmails = getTargetEmails();

  const handleSend = async () => {
    if (!subject.trim() || !htmlBody.trim()) {
      toast.error("Subject and body are required");
      return;
    }

    if (targetEmails.length === 0) {
      toast.error("No recipients found for the selected group");
      return;
    }

    const confirmSend = window.confirm(`Are you sure you want to send this email to ${targetEmails.length} recipients?`);
    if (!confirmSend) return;

    setIsSending(true);
    try {
      // Chunking if array is too large (Resend usually limits to 50 in a batch)
      const chunkSize = 50;
      let successCount = 0;

      for (let i = 0; i < targetEmails.length; i += chunkSize) {
        const chunk = targetEmails.slice(i, i + chunkSize);
        
        const { error } = await supabase.functions.invoke("send-email", {
          body: {
            to: chunk,
            subject,
            html: htmlBody,
            attachments: attachments.length > 0 ? attachments : undefined
          }
        });

        if (error) throw error;
        successCount += chunk.length;
      }

      toast.success(`Successfully sent emails to ${successCount} recipients!`);
      setSubject("");
      setHtmlBody("");
    } catch (error: any) {
      console.error("Broadcast error:", error);
      toast.error(error.message || "Failed to send broadcast emails");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Email Broadcast</h2>
          <p className="text-sm text-muted-foreground">Send custom emails to specific user groups via Resend API</p>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-6">
        {/* Composer */}
        <Card className="border-border/40 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Line</Label>
              <Input 
                id="subject"
                placeholder="e.g., Big Updates for String Businesses!" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Email HTML Body</Label>
              <Textarea 
                id="body"
                placeholder="<h1>Hello!</h1><p>Write your HTML content here...</p>"
                className="min-h-[300px] font-mono text-sm"
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
              />
            </div>

            <Button 
              className="w-full" 
              onClick={handleSend} 
              disabled={isSending || isLoading || targetEmails.length === 0}
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Broadcast...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send to {targetEmails.length} Recipients
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Sidebar Info & Targeting */}
        <div className="space-y-4">
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Target Audience</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={recipientType} onValueChange={setRecipientType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>All Users</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="businesses">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span>All Businesses</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="customers">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>All Customers</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="verified">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      <span>Verified Businesses</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="boosted">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-500" />
                      <span>Boosted Accounts</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              <div className="mt-6 p-4 bg-muted/50 rounded-xl border border-border/50 text-center">
                <p className="text-3xl font-black text-primary tracking-tight">
                  {isLoading ? "-" : targetEmails.length}
                </p>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1 font-semibold">
                  Valid Email Recipients
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="p-4 text-sm text-blue-800 dark:text-blue-300">
              <p className="font-bold mb-2">Pro Tips:</p>
              <ul className="list-disc pl-4 space-y-1 opacity-90 text-xs">
                <li>You can use HTML tags to style the email.</li>
                <li>Make sure the Resend API key is set in your Supabase edge function secrets.</li>
                <li>Use `style="..."` for inline styling in emails.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
