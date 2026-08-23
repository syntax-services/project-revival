import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Building2, MapPin, CheckCircle2, AlertCircle, 
  Loader2, ShieldCheck, ArrowLeft, Clock, Upload, CheckCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { StringVerifiedIcon } from "@/components/business/VerificationBadge";
import { playVerificationChime } from "@/hooks/useAudioSignals";
import { InterlockingLoader } from "@/components/ui/interlocking-loader";
import { StructuredLocationPicker } from "@/components/location/StructuredLocationPicker";
import { StructuredLocationSelection, formatStructuredLocation, getLocationCoords } from "@/hooks/useStructuredLocations";
import { getEdgeFunctionErrorMessage } from "@/lib/edgeFunctionErrors";

export default function BusinessVerify() {
  const { user, refreshProfile } = useAuth();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedLocation, setSelectedLocation] = useState<StructuredLocationSelection | null>(null);
  const [locationNote, setLocationNote] = useState("");
  const [tradeDescription, setTradeDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [verifyingDidit, setVerifyingDidit] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
        },
        (err) => {
          console.warn("Geolocation detection skipped:", err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please select a valid video file.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) { // 25MB limit
      toast.error("Video proof file size must be less than 25MB.");
      return;
    }

    setUploadingVideo(true);
    toast.info("Uploading video proof... Please keep the tab open.");

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id || Math.random()}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from("verification-videos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("verification-videos")
        .getPublicUrl(filePath);

      setVideoUrl(publicUrl);
      toast.success("Verification video proof uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload video proof.");
    } finally {
      setUploadingVideo(false);
    }
  };

  // Query latest location verification request
  const { data: request, isLoading } = useQuery({
    queryKey: ["my-location-request", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("location_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const submitLocationRequest = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not logged in");
      if (!selectedLocation || !tradeDescription.trim()) {
        throw new Error("Please fill in all verification fields.");
      }
      if (!videoUrl) {
        throw new Error("Please upload a video proof showing your physical setup.");
      }

      const formattedLocation = formatStructuredLocation(selectedLocation);
      const streetAddress = [formattedLocation, locationNote.trim()].filter(Boolean).join(" - ");
      const coords = getLocationCoords(selectedLocation);

      // Insert location verification request
      const { error } = await supabase
        .from("location_requests")
        .insert({
          user_id: user.id,
          user_type: "business",
          street_address: streetAddress,
          area_name: selectedLocation.area.name,
          admin_notes: `[Trade Details]: ${tradeDescription.trim()}`,
          status: "pending",
          latitude: coords.latitude,
          longitude: coords.longitude,
          video_url: videoUrl || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-location-request"] });
      playVerificationChime().catch(console.error);
      toast.success("Location verification request submitted successfully! ");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to submit request.");
    }
  });

  const handleDiditVerify = async () => {
    if (!user) return;
    setVerifyingDidit(true);
    try {
      const { data, error } = await supabase.functions.invoke("didit-session", {
        body: {
          session_kind: "business",
          callback: window.location.href,
        },
      });

      if (error) {
        throw new Error(await getEdgeFunctionErrorMessage(error, "Failed to start Didit verification."));
      }
      if (data?.url) {
        window.location.assign(data.url);
      } else {
        throw new Error("Failed to initialize Didit verification session.");
      }
    } catch (err: any) {
      console.error("Didit verification failed:", err);
      toast.error(err.message || "Failed to start Didit verification.");
    } finally {
      setVerifyingDidit(false);
    }
  };

  const isIdentityVerified = business?.verified || business?.verification_tier !== "none";
  const isLocationVerified = business?.location_verified || request?.status === "verified";

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto space-y-6 pb-20 animate-fade-in">
        
        {/* Header navigation bar */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/business/settings")}
            className="h-9 w-9 rounded-full border border-border/40 hover:bg-accent flex items-center justify-center transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5">
              Business Verification
            </h1>
            <p className="text-xs text-muted-foreground">Complete settings to unlock business features</p>
          </div>
        </div>

        {isLoading ? (
          <div className="dashboard-card py-16 flex items-center justify-center">
            <InterlockingLoader size="sm" label="Gathering credentials..." />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* LEVEL 2: IDENTITY VERIFICATION (DIDIT) */}
            <div className="dashboard-card p-6 space-y-4 rounded-[32px] relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Level 2: Secure Identity</h3>
                  <p className="text-xs text-muted-foreground">Verify ID & enable sub-account payouts</p>
                </div>
              </div>

              {isIdentityVerified ? (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">Identity Verified</p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 font-medium">
                      Verified via Didit Secure Gateway.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <p className="text-xs text-muted-foreground leading-relaxed leading-normal bg-muted/40 border border-border/10 p-3.5 rounded-2xl">
                    Verify your identity securely using **Didit** (NIN / International Passport / BVN) to enable unlimited payout withdrawals and build buyer trust.
                  </p>
                  <Button
                    onClick={handleDiditVerify}
                    disabled={verifyingDidit}
                    className="w-full rounded-xl h-11 bg-primary text-primary-foreground hover:bg-primary/95 transition-all font-semibold flex items-center justify-center gap-2"
                  >
                    {verifyingDidit ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Starting Didit...</>
                    ) : (
                      <>Verify Identity with Didit </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* LEVEL 1: LOCATION & COORDINATES AUDIT */}
            <div className="dashboard-card p-6 space-y-4 rounded-[32px]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Level 1: Trade Location</h3>
                  <p className="text-xs text-muted-foreground">Verify physical shop coordinates</p>
                </div>
              </div>

              {isLocationVerified ? (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">Location Verified</p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 font-medium">
                      Your store landmark and physical location coordinates are confirmed.
                    </p>
                  </div>
                </div>
              ) : request?.status === "pending" ? (
                <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/20 p-4 flex items-center gap-3 text-yellow-600 dark:text-yellow-400">
                  <Clock className="h-5 w-5 shrink-0 text-yellow-500 animate-pulse" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider">Location Review Pending</p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 font-medium">
                      Admins are auditing your shop coordinates and setup video proof.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <p className="text-xs text-muted-foreground leading-relaxed leading-normal bg-muted/40 border border-border/10 p-3.5 rounded-2xl">
                    Verify you trade at a physical shop location to appear in nearest merchant searches.
                  </p>

                  <div className="space-y-4">
                    <StructuredLocationPicker
                      label="Store landmark"
                      value={selectedLocation}
                      onChange={setSelectedLocation}
                      compact
                    />

                    <div className="space-y-1.5">
                      <Label htmlFor="locationNote" className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Shop / Room Note</Label>
                      <Input
                        id="locationNote"
                        value={locationNote}
                        onChange={(e) => setLocationNote(e.target.value)}
                        placeholder="e.g. Shop 5, beside the gate"
                        className="rounded-xl border-border/40 focus:ring-primary/20 h-10"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="tradeDesc" className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">What are you selling?</Label>
                      <Textarea
                        id="tradeDesc"
                        value={tradeDescription}
                        onChange={(e) => setTradeDescription(e.target.value)}
                        placeholder="Provide details about the items, products, or services you trade at this location. (e.g. 'I sell premium unisex hoodies, footwear, and caps.')"
                        className="rounded-xl border-border/40 focus:ring-primary/20 min-h-[100px] text-xs leading-relaxed"
                      />
                    </div>

                    {/* Geolocation Coordinates Status */}
                    <div className="p-3 bg-muted/40 border border-border/10 rounded-2xl space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Captured GPS Coordinates</p>
                      {latitude && longitude ? (
                        <p className="text-xs font-mono text-emerald-500 flex items-center gap-1.5 font-bold">
                          <MapPin className="h-3.5 w-3.5" />
                          {latitude.toFixed(6)}, {longitude.toFixed(6)}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-yellow-500 font-medium">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Detecting physical location coords...</span>
                        </div>
                      )}
                    </div>

                    {/* Video Proof Uploader */}
                    <div className="space-y-1.5">
                      <Label htmlFor="videoProof" className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                         Physical Setup Video Proof
                      </Label>
                      <div className="border border-dashed border-border/40 rounded-2xl p-4 text-center space-y-2 hover:bg-muted/10 transition-all duration-200 relative">
                        {videoUrl ? (
                          <div className="space-y-2">
                            <video src={videoUrl} controls className="max-h-32 mx-auto rounded bg-black border border-border/40" />
                            <p className="text-[10px] text-emerald-500 font-bold">✓ Verification video uploaded</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setVideoUrl("")}
                              className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive h-7 px-2"
                            >
                              Remove video
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="mx-auto h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              <Upload className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-foreground">Upload short video proof</p>
                              <p className="text-[10px] text-muted-foreground">Record your shop setup and location (max 25MB)</p>
                            </div>
                            <Input
                              id="videoProof"
                              type="file"
                              accept="video/*"
                              onChange={handleVideoUpload}
                              disabled={uploadingVideo}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                          </>
                        )}
                        {uploadingVideo && (
                          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-1.5 rounded-2xl">
                            <Loader2 className="h-5 w-5 text-primary animate-spin" />
                            <span className="text-[10px] font-bold text-muted-foreground">Uploading video proof...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => submitLocationRequest.mutate()}
                    disabled={submitLocationRequest.isPending || !selectedLocation || !tradeDescription.trim() || !videoUrl || uploadingVideo}
                    className="w-full rounded-xl h-11 bg-primary text-primary-foreground hover:bg-primary/95 transition-all font-semibold"
                  >
                    {submitLocationRequest.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting Audit...
                      </>
                    ) : (
                      "Submit Verification Request"
                    )}
                  </Button>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
