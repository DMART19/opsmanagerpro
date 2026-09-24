import { motion } from "framer-motion";
import { FileQuestion, Search } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpSearchInput } from "./HelpSearchInput";
import { cn } from "@/lib/utils";
import type { FAQItem } from "@/lib/help-content";

/**
 * FAQ Categories - Organized by user intent (what they're trying to do)
 * Not by feature list
 */
const faqCategories = [
  { id: "getting-started", label: "Getting Started", emoji: "🚀", description: "What to do first" },
  { id: "assets", label: "Assets & Inventory", emoji: "📦", description: "Track items and stock" },
  { id: "team", label: "Team & Credentials", emoji: "👥", description: "Manage people and certifications" },
  { id: "calendar", label: "Tasks & Calendar", emoji: "📅", description: "Schedule and deadlines" },
  { id: "alerts", label: "Alerts & Attention", emoji: "🔔", description: "Notifications and warnings" },
  { id: "settings", label: "Settings & Account", emoji: "⚙️", description: "Preferences and plans" },
  { id: "troubleshooting", label: "Troubleshooting", emoji: "🔧", description: "Fix common issues" },
] as const;

interface HelpFAQSectionProps {
  faqItems: FAQItem[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const HelpFAQSection = ({ 
  faqItems, 
  searchQuery, 
  onSearchChange 
}: HelpFAQSectionProps) => {
  // Filter FAQ items based on search
  const filteredFAQ = searchQuery.trim()
    ? faqItems.filter(item => 
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqItems;

  // Group filtered FAQ by category
  const groupedFAQ = faqCategories.map(cat => ({
    ...cat,
    items: filteredFAQ.filter(item => item.category === cat.id)
  })).filter(cat => cat.items.length > 0);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="space-y-5">
      <HelpSearchInput
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Search questions... (e.g., 'how do I add')"
      />

      {groupedFAQ.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/50 mb-4">
            <FileQuestion className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground font-medium">No matching questions found</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Try different keywords or browse by category
          </p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Search results summary */}
          {isSearching && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-muted-foreground px-1"
            >
              <Search className="h-3.5 w-3.5" />
              <span>
                Found <strong className="text-foreground">{filteredFAQ.length}</strong> result{filteredFAQ.length !== 1 ? 's' : ''} for "{searchQuery}"
              </span>
            </motion.div>
          )}

          {groupedFAQ.map((category, catIndex) => (
            <motion.div 
              key={category.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIndex * 0.05 }}
              className="space-y-2"
            >
              {/* Category header */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-base">{category.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {category.label}
                  </p>
                  {!isSearching && (
                    <p className="text-xs text-muted-foreground">
                      {category.description}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded-full">
                  {category.items.length}
                </span>
              </div>
              
              {/* FAQ items */}
              <Accordion type="single" collapsible className="w-full space-y-1.5">
                {category.items.map((item, index) => (
                  <AccordionItem 
                    key={`${category.id}-${index}`} 
                    value={`${category.id}-${index}`}
                    className={cn(
                      "border rounded-xl px-4 bg-card/50 transition-all duration-200",
                      "hover:bg-card hover:shadow-sm hover:border-primary/20",
                      "data-[state=open]:bg-card data-[state=open]:shadow-md data-[state=open]:border-primary/30"
                    )}
                  >
                    <AccordionTrigger className="text-left text-sm py-3.5 hover:no-underline gap-3 [&>svg]:text-primary/60">
                      <span className="font-medium">{item.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed whitespace-pre-line">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
