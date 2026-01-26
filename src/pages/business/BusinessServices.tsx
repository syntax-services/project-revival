import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useBusiness, useBusinessServices } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wrench, Plus, Pencil, Trash2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ServiceFormData {
  name: string;
  description: string;
  category: string;
  price_type: "fixed" | "hourly" | "range" | "quote";
  price_min: string;
  price_max: string;
  duration_estimate: string;
  availability: "available" | "busy" | "unavailable";
  location_coverage: string[];
}

const defaultFormData: ServiceFormData = {
  name: "",
  description: "",
  category: "",
  price_type: "fixed",
  price_min: "",
  price_max: "",
  duration_estimate: "",
  availability: "available",
  location_coverage: [],
};

const serviceCategories = [
  "Home Services",
  "Beauty & Wellness",
  "Repairs & Maintenance",
  "Professional Services",
  "Events & Entertainment",
  "Education & Training",
  "Transportation",
  "Health & Fitness",
  "Other",
];

export default function BusinessServices() {
  const { data: business } = useBusiness();
  const { data: services = [], isLoading } = useBusinessServices(business?.id);
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<typeof services[0] | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [locationInput, setLocationInput] = useState("");

  const openCreateDialog = () => {
    setEditingService(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const openEditDialog = (service: typeof services[0]) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      category: service.category || "",
      price_type: service.price_type as ServiceFormData["price_type"],
      price_min: service.price_min?.toString() || "",
      price_max: service.price_max?.toString() || "",
      duration_estimate: service.duration_estimate || "",
      availability: service.availability as ServiceFormData["availability"],
      location_coverage: service.location_coverage || [],
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    setSaving(true);
    try {
      const serviceData = {
        business_id: business.id,
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        price_type: formData.price_type,
        price_min: formData.price_min ? parseFloat(formData.price_min) : null,
        price_max: formData.price_max ? parseFloat(formData.price_max) : null,
        duration_estimate: formData.duration_estimate || null,
        availability: formData.availability,
        location_coverage: formData.location_coverage,
      };

      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update(serviceData)
          .eq("id", editingService.id);
        if (error) throw error;
        toast.success("Service updated successfully");
      } else {
        const { error } = await supabase
          .from("services")
          .insert(serviceData);
        if (error) throw error;
        toast.success("Service added successfully");
      }

      queryClient.invalidateQueries({ queryKey: ["business-services"] });
      setIsDialogOpen(false);
      setFormData(defaultFormData);
    } catch (error) {
      toast.error("Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (id: string) => {
    try {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
      toast.success("Service deleted");
      queryClient.invalidateQueries({ queryKey: ["business-services"] });
    } catch (error) {
      toast.error("Failed to delete service");
    }
  };

  const addLocation = () => {
    if (locationInput.trim() && !formData.location_coverage.includes(locationInput.trim())) {
      setFormData({
        ...formData,
        location_coverage: [...formData.location_coverage, locationInput.trim()],
      });
      setLocationInput("");
    }
  };

  const removeLocation = (location: string) => {
    setFormData({
      ...formData,
      location_coverage: formData.location_coverage.filter((l) => l !== location),
    });
  };

  const getPriceDisplay = (service: typeof services[0]) => {
    if (service.price_type === "quote") return "Quote on request";
    if (service.price_type === "hourly" && service.price_min) return `₦${Number(service.price_min).toLocaleString()}/hr`;
    if (service.price_type === "range" && service.price_min && service.price_max) {
      return `₦${Number(service.price_min).toLocaleString()} - ₦${Number(service.price_max).toLocaleString()}`;
    }
    if (service.price_min) return `₦${Number(service.price_min).toLocaleString()}`;
    return "—";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Services</h1>
            <p className="mt-1 text-muted-foreground">Manage your service offerings</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingService ? "Edit Service" : "Add Service"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Service Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price_type">Pricing Type</Label>
                    <Select
                      value={formData.price_type}
                      onValueChange={(value) => setFormData({ ...formData, price_type: value as ServiceFormData["price_type"] })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Price</SelectItem>
                        <SelectItem value="hourly">Hourly Rate</SelectItem>
                        <SelectItem value="range">Price Range</SelectItem>
                        <SelectItem value="quote">Quote on Request</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="availability">Availability</Label>
                    <Select
                      value={formData.availability}
                      onValueChange={(value) => setFormData({ ...formData, availability: value as ServiceFormData["availability"] })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="busy">Busy</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.price_type !== "quote" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price_min">
                        {formData.price_type === "range" ? "Min Price (₦)" : "Price (₦)"}
                      </Label>
                      <Input
                        id="price_min"
                        type="number"
                        value={formData.price_min}
                        onChange={(e) => setFormData({ ...formData, price_min: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    {formData.price_type === "range" && (
                      <div>
                        <Label htmlFor="price_max">Max Price (₦)</Label>
                        <Input
                          id="price_max"
                          type="number"
                          value={formData.price_max}
                          onChange={(e) => setFormData({ ...formData, price_max: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="duration">Duration Estimate</Label>
                  <Input
                    id="duration"
                    value={formData.duration_estimate}
                    onChange={(e) => setFormData({ ...formData, duration_estimate: e.target.value })}
                    placeholder="e.g., 2-3 hours, 1 day"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Service Locations</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      placeholder="Add location coverage"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLocation())}
                    />
                    <Button type="button" variant="secondary" onClick={addLocation}>Add</Button>
                  </div>
                  {formData.location_coverage.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.location_coverage.map((loc) => (
                        <Badge key={loc} variant="secondary" className="flex items-center gap-1">
                          {loc}
                          <button type="button" onClick={() => removeLocation(loc)}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={saving}>
                    {saving ? "Saving..." : editingService ? "Update" : "Add Service"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="dashboard-card animate-pulse">
                <div className="h-5 bg-muted rounded w-1/2 mb-3" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="dashboard-card text-center py-12">
            <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-medium text-foreground">No services yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Add your first service offering</p>
            <Button className="mt-4" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {services.map((service) => (
              <div key={service.id} className="dashboard-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground truncate">{service.name}</h3>
                      <Badge variant={service.availability === "available" ? "default" : "secondary"}>
                        {service.availability}
                      </Badge>
                    </div>
                    {service.category && (
                      <p className="text-sm text-muted-foreground">{service.category}</p>
                    )}
                    <p className="text-sm font-medium text-foreground mt-1">
                      {getPriceDisplay(service)}
                    </p>
                    {service.duration_estimate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Est. duration: {service.duration_estimate}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(service)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Service</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{service.name}"? This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteService(service.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
