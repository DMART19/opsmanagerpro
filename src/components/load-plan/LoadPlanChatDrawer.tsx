import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AiDisclaimer } from "@/components/ai/AiDisclaimer";

export interface LoadPlanContext {
  rowCount: number;
  totalWeight: number;
  totalVolume: number;
  pallet?: string;
  vehicle?: string;
  palletCount?: number;
  utilization?: number;
  alerts?: string[];
}

interface ChatMessage { role: "user" | "assistant"; content: string }

export const LoadPlanChatDrawer = ({
  open, onOpenChange, context,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: LoadPlanContext;
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I can help you optimize this load plan. Try: *Which trailer should I use?* or *What's causing low utilization?*" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("load-plan-chat", {
        body: { messages: next, context },
      });
      if (error) throw error;
      const reply = (data as { reply?: string })?.reply ?? "Sorry, I didn't catch that.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      toast.error("AI assistant error", { description: e?.message ?? "Try again later" });
      setMessages((m) => [...m, { role: "assistant", content: "I had trouble responding. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Load Plan Assistant</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as any}>
          <div className="space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {loading && <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Thinking...</div>}
          </div>
        </ScrollArea>
        <div className="border-t px-3 pt-2">
          <AiDisclaimer />
        </div>
        <div className="p-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Ask about the load plan..."
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()} size="icon"><Send className="w-4 h-4" /></Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};