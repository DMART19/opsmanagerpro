import { useState } from "react";
import { useAllAnnouncements, SystemAnnouncement } from "@/hooks/use-announcements";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const AnnouncementsManager = () => {
  const { data: announcements, isLoading } = useAllAnnouncements();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [endDate, setEndDate] = useState("");
  const [creating, setCreating] = useState(false);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["all-announcements"] });
    queryClient.invalidateQueries({ queryKey: ["active-announcements"] });
  };

  const handleCreate = async () => {
    if (!title.trim()) return toast.error("Title is required");
    setCreating(true);
    try {
      const { error } = await supabase.from("system_announcements" as any).insert({
        title: title.trim(),
        description: description.trim(),
        start_date: new Date(startDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        is_active: true,
      } as any);
      if (error) throw error;
      toast.success("Announcement published");
      setTitle("");
      setDescription("");
      setEndDate("");
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to create announcement");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("system_announcements" as any)
      .update({ is_active: !current } as any)
      .eq("id", id);
    if (error) return toast.error("Failed to update");
    toast.success(!current ? "Announcement enabled" : "Announcement disabled");
    refresh();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("system_announcements" as any)
      .delete()
      .eq("id", id);
    if (error) return toast.error("Failed to delete");
    toast.success("Announcement deleted");
    refresh();
  };

  const isActive = (a: SystemAnnouncement) => {
    if (!a.is_active) return false;
    const now = new Date();
    if (new Date(a.start_date) > now) return false;
    if (a.end_date && new Date(a.end_date) <= now) return false;
    return true;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Megaphone className="h-5 w-5" /> System Announcements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create form */}
        <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
          <p className="text-sm font-medium">New Announcement</p>
          <Input
            placeholder="Title — e.g. Scheduled maintenance tonight"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[60px] resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Start</Label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End (optional)</Label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={creating} className="gap-2" size="sm">
            <Plus className="h-4 w-4" /> Publish Announcement
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !announcements?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">No announcements yet.</p>
        ) : (
          <div className="space-y-2">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 border rounded-lg p-3"
              >
                <Switch
                  checked={a.is_active}
                  onCheckedChange={() => toggleActive(a.id, a.is_active)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                    {isActive(a) ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px]">Live</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-xs text-muted-foreground truncate">{a.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {format(new Date(a.start_date), "MMM d, h:mm a")}
                    {a.end_date && ` → ${format(new Date(a.end_date), "MMM d, h:mm a")}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(a.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
