/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Loader2, Settings, Zap } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { InterlockingLoader } from "@/components/ui/interlocking-loader";
import { cn } from "@/lib/utils";

interface AdminUsersTabProps {
  searchTerm: string;
  profiles: any[];
  customers: any[];
  loadingProfiles: boolean;
  refetchProfiles: () => void;
}

export function AdminUsersTab({
  searchTerm,
  profiles,
  customers,
  loadingProfiles,
  refetchProfiles,
}: AdminUsersTabProps) {
  const queryClient = useQueryClient();
  const [batchAvatarUrl, setBatchAvatarUrl] = useState("");
  const [batchFilter, setBatchFilter] = useState<'all' | 'male' | 'female' | 'neutral'>("all");
  const [editingProfile, setEditingProfile] = useState<any>(null);

  // Toggle user ban status mutation
  const toggleBanUserMutation = useMutation({
    mutationFn: async ({ userId, isBanned }: { userId: string; isBanned: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ banned: isBanned })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.isBanned ? "User banned successfully!" : "User unbanned successfully!");
      refetchProfiles();
    },
    onError: (err: any) => {
      toast.error("Failed to update user ban status: " + err.message);
    }
  });

  // Update user location manually
  const updateUserLocationMutation = useMutation({
    mutationFn: async ({ userId, address }: { userId: string; address: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ address })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User location updated!");
      refetchProfiles();
    },
    onError: (err: any) => {
      toast.error("Failed to update location: " + err.message);
    }
  });

  // Batch update avatars mutation
  const batchUpdateAvatarsMutation = useMutation({
    mutationFn: async ({ avatarUrl, filter }: { avatarUrl: string; filter: 'all' | 'male' | 'female' | 'neutral' }) => {
      let targetUserIds: string[] = [];

      if (filter === 'all') {
        targetUserIds = profiles.map((p: any) => p.id);
      } else if (filter === 'male') {
        targetUserIds = profiles
          .filter((p: any) => {
            if (p.user_type !== 'customer') return false;
            const customerObj = customers?.find((c: any) => c.user_id === p.id);
            return customerObj?.gender === 'male';
          })
          .map((p: any) => p.id);
      } else if (filter === 'female') {
        targetUserIds = profiles
          .filter((p: any) => {
            if (p.user_type !== 'customer') return false;
            const customerObj = customers?.find((c: any) => c.user_id === p.id);
            return customerObj?.gender === 'female';
          })
          .map((p: any) => p.id);
      } else if (filter === 'neutral') {
        targetUserIds = profiles
          .filter((p: any) => {
            if (p.user_type !== 'customer') return true;
            const customerObj = customers?.find((c: any) => c.user_id === p.id);
            return !customerObj?.gender || !['male', 'female'].includes(customerObj.gender);
          })
          .map((p: any) => p.id);
      }

      if (targetUserIds.length === 0) {
        throw new Error("No users found matching the selected target filter.");
      }

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .in("id", targetUserIds);

      if (error) throw error;
      return { count: targetUserIds.length };
    },
    onSuccess: (data) => {
      toast.success(`Successfully updated ${data.count} profile avatar(s)! `);
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      setBatchAvatarUrl("");
    },
    onError: (error: any) => {
      toast.error("Failed to batch update avatars: " + error.message);
    }
  });

  // Update profile settings mutation
  const updateUserProfileMutation = useMutation({
    mutationFn: async ({
      userId,
      themeMode,
      themePalette,
      avatarUrl
    }: {
      userId: string;
      themeMode: string;
      themePalette: string;
      avatarUrl?: string | null;
    }) => {
      const updates: any = {
        theme_mode: themeMode,
        theme_palette: themePalette,
      };
      if (avatarUrl !== undefined) {
        updates.avatar_url = avatarUrl;
      }
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User settings updated successfully! ");
      refetchProfiles();
    },
    onError: (err: any) => {
      toast.error("Failed to update user profile: " + err.message);
    }
  });

  return (
    <div className="space-y-4">
      {/* Global Avatar Batch Manager */}
      <Card className="border border-primary/20 bg-card/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-primary">
            <Zap className="h-5 w-5 animate-pulse" />
            Global Profile Picture Batch Manager
          </CardTitle>
          <CardDescription>
            Set a default profile picture for all registered users on String in one click. Perfect for resetting all avatars to standard 3D animated presets or a custom branding image.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            {/* Select Filter Target */}
            <div className="w-full lg:w-56 space-y-2">
              <Label htmlFor="batch-target-filter">Target User Group</Label>
              <Select
                value={batchFilter}
                onValueChange={(value: 'all' | 'male' | 'female' | 'neutral') => setBatchFilter(value)}
              >
                <SelectTrigger id="batch-target-filter" className="bg-background/50 h-10 border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all"> All Users</SelectItem>
                  <SelectItem value="male"> Male Customers Only</SelectItem>
                  <SelectItem value="female"> Female Customers Only</SelectItem>
                  <SelectItem value="neutral"> Unspecified / Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 space-y-2">
              <Label htmlFor="batch-avatar-url">Target Avatar URL</Label>
              <Input
                id="batch-avatar-url"
                placeholder="Enter custom image URL or select a preset..."
                value={batchAvatarUrl}
                onChange={(e) => setBatchAvatarUrl(e.target.value)}
                className="bg-background/50 h-10"
              />
            </div>
            <div className="flex flex-wrap gap-2 mb-0.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBatchAvatarUrl("/avatar_male.png")}
                className="gap-1 text-xs hover:bg-primary/10 hover:text-primary transition-all duration-300"
              >
                 Male Preset
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBatchAvatarUrl("/avatar_female.png")}
                className="gap-1 text-xs hover:bg-primary/10 hover:text-primary transition-all duration-300"
              >
                 Female Preset
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBatchAvatarUrl("/avatar_neutral.png")}
                className="gap-1 text-xs hover:bg-primary/10 hover:text-primary transition-all duration-300"
              >
                 Neutral Preset
              </Button>
            </div>
            <Button
              variant="destructive"
              onClick={() => {
                if (!batchAvatarUrl) {
                  toast.error("Please enter or select an avatar URL first");
                  return;
                }
                
                const groupLabel = {
                  all: "ALL registered users",
                  male: "all MALE customers",
                  female: "all FEMALE customers",
                  neutral: "all UNSPECIFIED/GENDER-NEUTRAL accounts (including businesses and admins)"
                }[batchFilter];

                if (confirm(`WARNING: You are about to change the profile picture of ${groupLabel} to "${batchAvatarUrl}". This action is irreversible. Do you want to continue?`)) {
                  batchUpdateAvatarsMutation.mutate({ avatarUrl: batchAvatarUrl, filter: batchFilter });
                }
              }}
              disabled={batchUpdateAvatarsMutation.isPending}
              className="gap-2 shrink-0 font-bold h-10 px-5 shadow-lg shadow-destructive/20"
            >
              {batchUpdateAvatarsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Execute Batch Update
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({profiles?.length || 0})</CardTitle>
          <CardDescription>Complete list of all registered users and their theme settings</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingProfiles ? (
            <div className="flex items-center justify-center py-12">
              <InterlockingLoader size="sm" label="Loading users..." />
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Theme / Palette</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles
                        ?.filter((p: any) =>
                          p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.email?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((profile: any) => {
                          const userGender = profile.user_type === 'customer'
                            ? customers?.find((c: any) => c.user_id === profile.id)?.gender
                            : null;
                          const recommendedAvatar = userGender === 'male'
                            ? '/avatar_male.png'
                            : userGender === 'female'
                              ? '/avatar_female.png'
                              : '/avatar_neutral.png';

                          return (
                            <TableRow key={profile.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full overflow-hidden border border-border bg-card flex items-center justify-center shrink-0 shadow-inner">
                                    <img
                                      src={profile.avatar_url || recommendedAvatar}
                                      alt={profile.full_name}
                                      className="h-full w-full object-cover transition-all duration-300 hover:scale-110"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = recommendedAvatar;
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <p className="font-medium">{profile.full_name}</p>
                                    <p className="text-xs text-muted-foreground">{profile.email || "(No email provided)"}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={profile.user_type === 'business' ? 'default' : profile.user_type === 'admin' ? 'destructive' : 'secondary'}>
                                  {profile.user_type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {profile.latitude && profile.longitude ? (
                                  <Badge variant="outline">
                                    <MapPin className="h-3 w-3 mr-1 text-primary" />
                                    Set ({profile.latitude.toFixed(2)}, {profile.longitude.toFixed(2)})
                                  </Badge>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-sm">{profile.address || "Not set"}</span>
                                    <Button variant="ghost" size="sm" onClick={() => {
                                      const loc = prompt("Set user address string manually:");
                                      if (loc) updateUserLocationMutation.mutate({ userId: profile.id, address: loc });
                                    }}>
                                      Edit
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1.5 flex-wrap">
                                  <Badge variant="outline" className="text-xs gap-1 py-0.5">
                                    {profile.theme_mode === 'dark' ? ' Dark' : ' Light'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs gap-1 py-0.5 border-primary/30 text-primary">
                                     {{ blue: 'Blue', mono: 'Mono', rose: 'Rose', emerald: 'Emerald', sunset: 'Sunset', amber: 'Amber', custom: 'Custom' }[profile.theme_palette || 'blue'] || 'Blue'}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={profile.onboarding_completed ? 'outline' : 'destructive'}>
                                  {profile.onboarding_completed ? 'Active' : 'Onboarding'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(profile.created_at), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center gap-2 justify-end">
                                  {profile.user_type !== 'admin' && (
                                    <Button
                                      variant={profile.banned ? "secondary" : "destructive"}
                                      size="sm"
                                      onClick={() => {
                                        if (confirm(`Are you sure you want to ${profile.banned ? "UNBAN" : "BAN"} this user (${profile.full_name})?`)) {
                                          toggleBanUserMutation.mutate({ userId: profile.id, isBanned: !profile.banned });
                                        }
                                      }}
                                      className="h-8 text-xs font-bold shadow-sm"
                                    >
                                      {profile.banned ? " Unban" : " Ban"}
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingProfile({
                                      id: profile.id,
                                      full_name: profile.full_name,
                                      email: profile.email,
                                      theme_mode: profile.theme_mode || 'dark',
                                      theme_palette: profile.theme_palette || 'blue',
                                      avatar_url: profile.avatar_url || '',
                                      user_type: profile.user_type
                                    })}
                                    className="h-8 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-all duration-300 border-primary/20"
                                  >
                                    Edit Settings
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              {/* Mobile Card Layout */}
              <div className="md:hidden space-y-3">
                {profiles
                  ?.filter((p: any) =>
                    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((profile: any) => {
                    const userGender = profile.user_type === 'customer'
                      ? customers?.find((c: any) => c.user_id === profile.id)?.gender
                      : null;
                    const recommendedAvatar = userGender === 'male'
                      ? '/avatar_male.png'
                      : userGender === 'female'
                        ? '/avatar_female.png'
                        : '/avatar_neutral.png';

                    return (
                      <div key={profile.id} className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-4 space-y-3 shadow-sm">
                        {/* User Info Row */}
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-primary/20 bg-card shrink-0">
                            <img
                              src={profile.avatar_url || recommendedAvatar}
                              alt={profile.full_name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = recommendedAvatar;
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{profile.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{profile.email || '(No email)'}</p>
                          </div>
                          <Badge variant={profile.user_type === 'business' ? 'default' : profile.user_type === 'admin' ? 'destructive' : 'secondary'}>
                            {profile.user_type}
                          </Badge>
                        </div>

                        {/* Badges Row */}
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-xs gap-1 py-0.5">
                            {profile.theme_mode === 'dark' ? ' Dark' : ' Light'}
                          </Badge>
                          <Badge variant="outline" className="text-xs gap-1 py-0.5 border-primary/30 text-primary">
                             {{ blue: 'Blue', mono: 'Mono', rose: 'Rose', emerald: 'Emerald', sunset: 'Sunset', amber: 'Amber', custom: 'Custom' }[profile.theme_palette || 'blue'] || 'Blue'}
                          </Badge>
                          <Badge variant={profile.onboarding_completed ? 'outline' : 'destructive'}>
                            {profile.onboarding_completed ? 'Active' : 'Onboarding'}
                          </Badge>
                          <Badge variant="outline" className="text-xs text-muted-foreground py-0.5">
                            {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
                          </Badge>
                        </div>

                        {/* Actions Row */}
                        <div className="flex gap-2 pt-1">
                          {profile.user_type !== 'admin' && (
                            <Button
                              variant={profile.banned ? "secondary" : "destructive"}
                              size="sm"
                              onClick={() => {
                                if (confirm(`Are you sure you want to ${profile.banned ? "UNBAN" : "BAN"} this user (${profile.full_name})?`)) {
                                  toggleBanUserMutation.mutate({ userId: profile.id, isBanned: !profile.banned });
                                }
                              }}
                              className="flex-1 h-9 text-xs font-bold shadow-sm"
                            >
                              {profile.banned ? " Unban" : " Ban"}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingProfile({
                              id: profile.id,
                              full_name: profile.full_name,
                              email: profile.email,
                              theme_mode: profile.theme_mode || 'dark',
                              theme_palette: profile.theme_palette || 'blue',
                              avatar_url: profile.avatar_url || '',
                              user_type: profile.user_type
                            })}
                            className="flex-1 h-9 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-all duration-300 border-primary/20"
                          >
                            Edit Settings
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
        <DialogContent className="max-w-md border border-primary/20 bg-card/95 backdrop-blur-2xl text-foreground">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary">
              <Settings className="h-5 w-5" />
              Edit User Settings
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Customize theme preferences and profile picture for <strong>{editingProfile?.full_name}</strong>
            </DialogDescription>
          </DialogHeader>

          {editingProfile && (
            <div className="space-y-6 my-4">
              {/* Theme Mode Selector */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold tracking-wide">Theme Mode</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={editingProfile.theme_mode === 'dark' ? 'default' : 'outline'}
                    onClick={() => setEditingProfile({ ...editingProfile, theme_mode: 'dark' })}
                    className="w-full flex items-center gap-2 justify-center"
                  >
                     Dark Mode
                  </Button>
                  <Button
                    type="button"
                    variant={editingProfile.theme_mode === 'light' ? 'default' : 'outline'}
                    onClick={() => setEditingProfile({ ...editingProfile, theme_mode: 'light' })}
                    className="w-full flex items-center gap-2 justify-center"
                  >
                     Light Mode
                  </Button>
                </div>
              </div>

              {/* Theme Palette Selector */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold tracking-wide">Theme Accent Palette</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { v: 'blue', c: '#2563EB', l: 'Blue' },
                    { v: 'mono', c: '#525252', l: 'Mono' },
                    { v: 'rose', c: '#D08F8F', l: 'Rose' },
                    { v: 'emerald', c: '#95BF47', l: 'Emerald' },
                    { v: 'sunset', c: '#F68B1E', l: 'Sunset' },
                    { v: 'amber', c: '#FF9900', l: 'Amber' },
                    { v: 'custom', c: '#6D5ACD', l: 'Custom' },
                  ].map((p) => (
                    <button
                      key={p.v}
                      type="button"
                      onClick={() => setEditingProfile({ ...editingProfile, theme_palette: p.v as any })}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
                        editingProfile.theme_palette === p.v
                          ? 'border-primary bg-primary/10 text-primary shadow-sm'
                          : 'border-border text-muted-foreground hover:border-primary/40'
                      )}
                    >
                      <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: p.c }} />
                      {p.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Profile Picture Settings */}
              <div className="space-y-4">
                <Label className="text-sm font-semibold tracking-wide">Profile Picture (Avatar)</Label>
                
                {/* Live Preview */}
                <div className="flex items-center gap-4 p-3 rounded-xl border border-border bg-background/40">
                  <div className="h-16 w-16 rounded-full overflow-hidden border border-primary/20 bg-card flex items-center justify-center shrink-0 shadow-inner">
                    <img
                      src={
                        editingProfile.avatar_url || (
                          editingProfile.user_type === 'customer'
                            ? (customers?.find((c: any) => c.user_id === editingProfile.id)?.gender === 'male'
                              ? '/avatar_male.png'
                              : customers?.find((c: any) => c.user_id === editingProfile.id)?.gender === 'female'
                                ? '/avatar_female.png'
                                : '/avatar_neutral.png')
                            : '/avatar_neutral.png'
                        )
                      }
                      alt="Preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/avatar_neutral.png';
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Avatar Preview</p>
                    <p className="text-xs truncate text-muted-foreground mt-0.5">
                      {editingProfile.avatar_url || "Using System Gender Fallback"}
                    </p>
                  </div>
                </div>

                {/* Preset Buttons */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Premium 3D Presets</span>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={editingProfile.avatar_url === '/avatar_male.png' ? 'default' : 'outline'}
                      onClick={() => setEditingProfile({ ...editingProfile, avatar_url: '/avatar_male.png' })}
                      className="text-xs p-1 h-12 flex flex-col justify-center gap-0.5"
                    >
                      <span className="font-semibold"> Male Preset</span>
                    </Button>
                    <Button
                      type="button"
                      variant={editingProfile.avatar_url === '/avatar_female.png' ? 'default' : 'outline'}
                      onClick={() => setEditingProfile({ ...editingProfile, avatar_url: '/avatar_female.png' })}
                      className="text-xs p-1 h-12 flex flex-col justify-center gap-0.5"
                    >
                      <span className="font-semibold"> Female Preset</span>
                    </Button>
                    <Button
                      type="button"
                      variant={editingProfile.avatar_url === '/avatar_neutral.png' ? 'default' : 'outline'}
                      onClick={() => setEditingProfile({ ...editingProfile, avatar_url: '/avatar_neutral.png' })}
                      className="text-xs p-1 h-12 flex flex-col justify-center gap-0.5"
                    >
                      <span className="font-semibold"> Neutral Preset</span>
                    </Button>
                  </div>
                </div>

                {/* Custom URL Input */}
                <div className="space-y-2">
                  <Label htmlFor="custom-avatar-url" className="text-xs text-muted-foreground">Or Enter Custom Avatar URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-avatar-url"
                      placeholder="https://example.com/image.jpg"
                      value={editingProfile.avatar_url}
                      onChange={(e) => setEditingProfile({ ...editingProfile, avatar_url: e.target.value })}
                      className="bg-background/50 text-sm h-9"
                    />
                    {editingProfile.avatar_url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingProfile({ ...editingProfile, avatar_url: "" })}
                        className="text-xs shrink-0 px-2"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingProfile(null)}
              disabled={updateUserProfileMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateUserProfileMutation.mutate({
                  userId: editingProfile.id,
                  themeMode: editingProfile.theme_mode,
                  themePalette: editingProfile.theme_palette,
                  avatarUrl: editingProfile.avatar_url || null
                });
                setEditingProfile(null);
              }}
              disabled={updateUserProfileMutation.isPending}
              className="gap-2 font-bold"
            >
              {updateUserProfileMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
