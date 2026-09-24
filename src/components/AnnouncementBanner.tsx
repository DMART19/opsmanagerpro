import { useState } from "react";
import { X, Megaphone } from "lucide-react";
import { useActiveAnnouncements } from "@/hooks/use-announcements";
import { cn } from "@/lib/utils";

export const AnnouncementBanner = () => {
  const { data: announcements } = useActiveAnnouncements();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = (announcements || []).filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => setDismissed((prev) => new Set(prev).add(id));

  return (
    <div className="space-y-0">
      {visible.map((a) => (
        <div
          key={a.id}
          className="relative bg-primary text-primary-foreground px-4 py-2.5 flex items-center justify-center gap-3 text-sm"
        >
          <Megaphone className="h-4 w-4 shrink-0" />
          <p className="text-center">
            <span className="font-semibold">{a.title}</span>
            {a.description && (
              <span className="ml-1.5 opacity-90">— {a.description}</span>
            )}
          </p>
          <button
            onClick={() => dismiss(a.id)}
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Dismiss announcement"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
