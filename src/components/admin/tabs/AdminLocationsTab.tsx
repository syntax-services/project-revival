/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { playVerificationChime } from "@/hooks/useAudioSignals";
import { usePremiumMail } from "@/hooks/usePremiumMail";

interface AdminLocationsTabProps {
  pendingLocations: any[];
  allUsersWithLocations: any[];
  businesses: any[];
  refetchLocations: () => void;
  refetchProfiles: () => void;
}

function LocationVerificationCard({ request, businessName, onVerify, onReject, isLoading }: any) {
  const [latitude, setLatitude] = useState(request.latitude?.toString() || "");
  const [longitude, setLongitude] = useState(request.longitude?.toString() || "");

  useEffect(() => {
    if (request.latitude) setLatitude(request.latitude.toString());
    if (request.longitude) setLongitude(request.longitude.toString());
  }, [request.latitude, request.longitude]);

  return (
    <div className="p-3 border rounded-lg border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant={request.user_type === 'business' ? 'default' : 'secondary'}>
            {request.user_type}
          </Badge>
          {businessName && (
            <span className="text-xs font-bold text-foreground">
               {businessName}
            </span>
          )}
        </div>
      </div>
      <p className="font-medium text-sm">{request.profiles?.full_name}</p>
      <p className="text-xs text-muted-foreground">{request.profiles?.email}</p>
      <div className="mt-2 p-2 bg-muted rounded text-xs">
        <p><strong>Street:</strong> {request.street_address}</p>
        {request.area_name && <p><strong>Area:</strong> {request.area_name}</p>}
        {request.landmark && <p><strong>Landmark:</strong> {request.landmark}</p>}
      </div>

      <div className="mt-2 flex gap-2 items-center">
        <Input
          placeholder="Latitude"
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
          className="h-8 text-xs font-mono"
        />
        <Input
          placeholder="Longitude"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
          className="h-8 text-xs font-mono"
        />
      </div>

      <div className="mt-3 flex gap-2 justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const query = encodeURIComponent(
              `${request.street_address || ''}, ${request.area_name || ''}, ${request.landmark || ''}, Ago Iwoye, Ogun State, Nigeria`
            );
            window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
          }}
          className="h-8 text-xs"
        >
          Open Maps 
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={onReject}
          disabled={isLoading}
          className="h-8 text-xs"
        >
          Reject
        </Button>
        <Button
          size="sm"
          onClick={() => onVerify(parseFloat(latitude) || null, parseFloat(longitude) || null)}
          disabled={isLoading}
          className="h-8 text-xs bg-green-600 hover:bg-green-700"
        >
          {isLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
          Approve & Save
        </Button>
      </div>
    </div>
  );
}

export function AdminLocationsTab({
  pendingLocations,
  allUsersWithLocations,
  businesses,
  refetchLocations,
  refetchProfiles,
}: AdminLocationsTabProps) {
  const { dispatchEmail } = usePremiumMail();

  // Verify location mutation
  const verifyLocationMutation = useMutation({
    mutationFn: async ({
      requestId,
      userId,
      userType,
      latitude,
      longitude,
      approved,
      email,
      fullName,
      streetAddress,
      areaName
    }: {
      requestId: string;
      userId: string;
      userType: string;
      latitude?: number | null;
      longitude?: number | null;
      approved: boolean;
      email?: string;
      fullName?: string;
      streetAddress?: string;
      areaName?: string;
    }) => {
      // 1. Update location request status ('verified' | 'rejected' to satisfy location_requests_status_check)
      const { error: reqError } = await supabase
        .from("location_requests")
        .update({
          status: approved ? 'verified' : 'rejected',
          latitude: approved ? latitude : null,
          longitude: approved ? longitude : null,
          verified_at: approved ? new Date().toISOString() : null,
          verified_latitude: approved ? latitude : null,
          verified_longitude: approved ? longitude : null,
        })
        .eq("id", requestId);
      if (reqError) throw reqError;

      if (approved) {
        // 2. If business, mark location_verified = true and update coordinates
        if (userType === 'business') {
          const { error: bizError } = await supabase
            .from("businesses")
            .update({
              latitude,
              longitude,
              location_verified: true,
              business_location: `${streetAddress || ''}${areaName ? ', ' + areaName : ''}`.trim() || undefined
            })
            .eq("user_id", userId);
          if (bizError) throw bizError;
        } else {
          // If customer, update customer coordinates
          const { error: custError } = await supabase
            .from("customers")
            .update({
              latitude,
              longitude,
              location_verified: true,
              street_address: streetAddress,
              area_name: areaName,
            })
            .eq("user_id", userId);
          if (custError) throw custError;
        }
      }

      return { approved, email, fullName, userType };
    },
    onSuccess: (data) => {
      refetchLocations();
      refetchProfiles();
      if (data.approved) {
        playVerificationChime();
        toast.success("Location approved & verified successfully! ");
        if (data.email) {
          dispatchEmail({
            type: "custom",
            recipientEmail: data.email,
            recipientName: data.fullName || "User",
            recipientType: data.userType === "business" ? "business" : "customer",
            subject: "Location Coordinates Verified!",
            customTitle: "Your Location is Verified ",
            customMessage: "Your physical store/profile location has been verified by the String Admin Team. Your business is now discoverable on the campus map!"
          });
        }
      } else {
        toast.info("Location request rejected.");
      }
    },
    onError: (err: any) => {
      toast.error("Failed to process location: " + err.message);
    }
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pending Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Verification ({pendingLocations.length})</CardTitle>
            <CardDescription>Verify user locations from Google Maps</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {pendingLocations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending requests</p>
                ) : (
                  pendingLocations.map((request: any) => {
                    const matchingBiz = businesses?.find((b: any) => b.user_id === request.user_id);
                    return (
                      <LocationVerificationCard
                        key={request.id}
                        request={request}
                        businessName={matchingBiz?.company_name}
                        onVerify={(lat: number | null, lng: number | null) => verifyLocationMutation.mutate({
                          requestId: request.id,
                          userId: request.user_id,
                          userType: request.user_type,
                          latitude: lat,
                          longitude: lng,
                          approved: true,
                          email: request.profiles?.email,
                          fullName: request.profiles?.full_name,
                          streetAddress: request.street_address,
                          areaName: request.area_name
                        })}
                        onReject={() => verifyLocationMutation.mutate({
                          requestId: request.id,
                          userId: request.user_id,
                          userType: request.user_type,
                          approved: false,
                          email: request.profiles?.email,
                          fullName: request.profiles?.full_name,
                        })}
                        isLoading={verifyLocationMutation.isPending}
                      />
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* All Users with Locations */}
        <Card>
          <CardHeader>
            <CardTitle>All User Locations ({allUsersWithLocations.length})</CardTitle>
            <CardDescription>Users with coordinates set</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {allUsersWithLocations.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${user.type === 'business' ? 'bg-primary/10' : 'bg-muted'}`}>
                        {user.type === 'business' ? (
                          <Building2 className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.lat.toFixed(4)}, {user.lng.toFixed(4)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.verified ? 'default' : 'secondary'}>
                        {user.verified ? 'Verified' : 'Unverified'}
                      </Badge>
                      <a
                        href={`https://www.google.com/maps?q=${user.lat},${user.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs"
                      >
                        View Map
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
