/**
 * Help Center Modal — OpsManagerPro
 * 
 * Redesigned as an intelligent owner's manual with:
 * - Category grid landing
 * - Full-text search across all articles & questions
 * - Article detail view with related articles
 * - Common Questions section
 */

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  Search,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  MessageSquare,
  CheckCircle2,
  Lightbulb,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FeedbackModal, FeedbackType } from "@/components/feedback/FeedbackModal";
import {
  helpCategories,
  helpArticles,
  commonQuestions,
  type HelpArticle,
  type HelpCategory,
} from "@/lib/help-content";
import { smartHelpSearch, type SmartSearchResult } from "@/lib/help-search";
import { cn } from "@/lib/utils";

interface HelpCenterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type View =
  | { type: "home" }
  | { type: "category"; categoryId: string }
  | { type: "article"; articleId: string }
  | { type: "search"; query: string };

export const HelpCenterModal = ({ open, onOpenChange }: HelpCenterModalProps) => {
  const [view, setView] = useState<View>({ type: "home" });
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Reset on close
  const handleOpenChange = useCallback((o: boolean) => {
    if (!o) {
      setTimeout(() => {
        setView({ type: "home" });
        setSearchQuery("");
      }, 200);
    }
    onOpenChange(o);
  }, [onOpenChange]);

  // Smart search with synonym expansion
  const searchResults = useMemo(() => {
    return smartHelpSearch(searchQuery);
  }, [searchQuery]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.trim()) {
      setView({ type: "search", query: q });
    } else if (view.type === "search") {
      setView({ type: "home" });
    }
  };

  const goHome = () => {
    setView({ type: "home" });
    setSearchQuery("");
  };

  const getArticle = (id: string) => helpArticles.find(a => a.id === id);
  const getCategory = (id: string) => helpCategories.find(c => c.id === id);
  const getCategoryArticles = (categoryId: string) => helpArticles.filter(a => a.categoryId === categoryId);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0 gap-0 rounded-2xl border-border/50">
          <DialogTitle className="sr-only">Help Center</DialogTitle>

          {/* Header */}
          <div className="relative px-6 pt-5 pb-4 border-b border-border/30">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />

            <div className="relative">
              {/* Top row: back button + title */}
              <div className="flex items-center gap-3 mb-3">
                {view.type !== "home" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={goHome}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                    <HelpCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold leading-tight">Help Center</h2>
                    <p className="text-xs text-muted-foreground">
                      {view.type === "home"
                        ? "Find answers, guides, and step-by-step instructions"
                        : view.type === "category"
                        ? getCategory(view.categoryId)?.title
                        : view.type === "article"
                        ? getCategory(getArticle(view.articleId)?.categoryId || "")?.title
                        : `Search results for "${searchQuery}"`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder='Ask a question... (e.g. "How do I move items?")'
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 pr-9 h-10 bg-muted/50 border-border/30"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="h-[480px]">
            <div className="px-6 py-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={view.type === "article" ? `article-${(view as any).articleId}` : view.type === "category" ? `cat-${(view as any).categoryId}` : view.type}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* HOME VIEW */}
                  {view.type === "home" && (
                    <div className="space-y-6">
                      {/* Category Grid */}
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-3">
                          Browse by Category
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {helpCategories.map((cat, i) => {
                            const count = getCategoryArticles(cat.id).length;
                            return (
                              <button
                                key={cat.id}
                                onClick={() => setView({ type: "category", categoryId: cat.id })}
                                className="group flex items-start gap-3 p-3.5 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:bg-muted/30 transition-all text-left"
                              >
                                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors shrink-0">
                                  <cat.icon className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium leading-tight">{cat.title}</p>
                                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{cat.description}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                                  <span className="text-[10px] text-muted-foreground/50">{count}</span>
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Common Questions */}
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-3">
                          Common Questions
                        </p>
                        <Accordion type="single" collapsible className="space-y-1.5">
                          {commonQuestions.slice(0, 6).map((q, i) => (
                            <AccordionItem
                              key={i}
                              value={`cq-${i}`}
                              className="border rounded-xl px-4 bg-card/50 hover:bg-card hover:shadow-sm transition-all data-[state=open]:bg-card data-[state=open]:shadow-sm"
                            >
                              <AccordionTrigger className="text-left text-[13px] py-3 hover:no-underline gap-3 [&>svg]:text-primary/50">
                                <span className="font-medium">{q.question}</span>
                              </AccordionTrigger>
                              <AccordionContent className="text-[13px] text-muted-foreground pb-3 leading-relaxed">
                                {q.answer}
                                {q.relatedArticleId && (
                                  <button
                                    onClick={() => setView({ type: "article", articleId: q.relatedArticleId! })}
                                    className="block mt-2 text-primary text-xs font-medium hover:underline"
                                  >
                                    Read full guide →
                                  </button>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>

                      {/* Contact footer */}
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/30">
                        <div className="flex items-center gap-2.5">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Can't find what you need?</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            handleOpenChange(false);
                            setTimeout(() => setFeedbackOpen(true), 200);
                          }}
                        >
                          Contact Support
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* SEARCH VIEW */}
                  {view.type === "search" && searchResults && (
                    <div className="space-y-5">
                      {searchResults.articles.length === 0 && searchResults.questions.length === 0 ? (
                        <div className="text-center py-12">
                          <Search className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground font-medium">No results found</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">Try rephrasing your question or browse categories</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground">
                            Found {searchResults.articles.length + searchResults.questions.length} result{searchResults.articles.length + searchResults.questions.length !== 1 ? "s" : ""}
                          </p>

                          {/* Best Match */}
                          {searchResults.bestMatch && (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <Lightbulb className="h-3 w-3 text-primary" />
                                <p className="text-[11px] uppercase tracking-wider text-primary font-semibold">Best Match</p>
                              </div>
                              <button
                                onClick={() => setView({ type: "article", articleId: searchResults.bestMatch!.id })}
                                className="w-full text-left p-3.5 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all group"
                              >
                                <p className="text-[13px] font-semibold">{searchResults.bestMatch.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{searchResults.bestMatch.summary}</p>
                                {searchResults.matchReason && (
                                  <p className="text-[10px] text-primary/70 mt-1 font-medium">{searchResults.matchReason}</p>
                                )}
                              </button>
                            </div>
                          )}

                          {searchResults.articles.length > 1 && (
                            <div className="space-y-1.5">
                              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">More Articles</p>
                              {searchResults.articles.slice(1).map(a => (
                                <ArticleRow key={a.id} article={a} onClick={() => setView({ type: "article", articleId: a.id })} />
                              ))}
                            </div>
                          )}

                          {searchResults.questions.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Questions</p>
                              <Accordion type="single" collapsible className="space-y-1.5">
                                {searchResults.questions.map((q, i) => (
                                  <AccordionItem
                                    key={i}
                                    value={`sq-${i}`}
                                    className="border rounded-xl px-4 bg-card/50 hover:bg-card transition-all"
                                  >
                                    <AccordionTrigger className="text-left text-[13px] py-3 hover:no-underline [&>svg]:text-primary/50">
                                      <span className="font-medium">{q.question}</span>
                                    </AccordionTrigger>
                                    <AccordionContent className="text-[13px] text-muted-foreground pb-3 leading-relaxed">
                                      {q.answer}
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* CATEGORY VIEW */}
                  {view.type === "category" && (
                    <CategoryView
                      category={getCategory(view.categoryId)!}
                      articles={getCategoryArticles(view.categoryId)}
                      onSelectArticle={(id) => setView({ type: "article", articleId: id })}
                    />
                  )}

                  {/* ARTICLE VIEW */}
                  {view.type === "article" && (
                    <ArticleView
                      article={getArticle(view.articleId)!}
                      onNavigate={(id) => setView({ type: "article", articleId: id })}
                      onBack={() => {
                        const article = getArticle(view.articleId);
                        if (article) setView({ type: "category", categoryId: article.categoryId });
                        else goHome();
                      }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        initialType={"feedback" as FeedbackType}
      />
    </>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────

const ArticleRow = ({ article, onClick }: { article: HelpArticle; onClick: () => void }) => {
  const cat = helpCategories.find(c => c.id === article.categoryId);
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/50 hover:bg-card hover:border-primary/20 hover:shadow-sm transition-all text-left group"
    >
      {cat && (
        <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
          <cat.icon className="h-3.5 w-3.5 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate">{article.title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{article.summary}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary/50 shrink-0" />
    </button>
  );
};

const CategoryView = ({
  category,
  articles,
  onSelectArticle,
}: {
  category: HelpCategory;
  articles: HelpArticle[];
  onSelectArticle: (id: string) => void;
}) => {
  const Icon = category.icon;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold">{category.title}</h3>
          <p className="text-xs text-muted-foreground">{category.description}</p>
        </div>
      </div>

      <div className="space-y-2">
        {articles.map(a => (
          <ArticleRow key={a.id} article={a} onClick={() => onSelectArticle(a.id)} />
        ))}
      </div>

      {articles.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No articles in this category yet.
        </div>
      )}
    </div>
  );
};

const ArticleView = ({
  article,
  onNavigate,
  onBack,
}: {
  article: HelpArticle;
  onNavigate: (id: string) => void;
  onBack: () => void;
}) => {
  const cat = helpCategories.find(c => c.id === article.categoryId);
  const relatedArticles = (article.relatedArticles || [])
    .map(id => helpArticles.find(a => a.id === id))
    .filter(Boolean) as HelpArticle[];

  return (
    <div className="space-y-5">
      {/* Article Header */}
      <div>
        {cat && (
          <button
            onClick={onBack}
            className="text-[11px] text-primary font-medium mb-2 flex items-center gap-1 hover:underline"
          >
            <cat.icon className="h-3 w-3" />
            {cat.title}
          </button>
        )}
        <h3 className="text-lg font-semibold leading-tight">{article.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{article.summary}</p>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">
          Step-by-step
        </p>
        <ol className="space-y-2">
          {article.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-foreground/90 leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Tips */}
      {article.tips && article.tips.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium flex items-center gap-1.5">
            <Lightbulb className="h-3 w-3 text-warning" />
            Tips
          </p>
          <ul className="space-y-1.5">
            {article.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary/50 shrink-0 mt-0.5" />
                <span className="text-muted-foreground leading-relaxed">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/30">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">
            Related Articles
          </p>
          <div className="space-y-1.5">
            {relatedArticles.map(ra => (
              <button
                key={ra.id}
                onClick={() => onNavigate(ra.id)}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors text-left group"
              >
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                <span className="text-[13px] font-medium text-foreground/80 group-hover:text-foreground truncate">
                  {ra.title}
                </span>
                <ChevronRight className="h-3 w-3 text-muted-foreground/30 ml-auto shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
