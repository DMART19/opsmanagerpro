/**
 * Help Center — Full-page, searchable, visually guided help system
 * with category sidebar navigation & article pagination.
 */

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  CheckCircle2,
  Lightbulb,
  MessageSquare,
  Zap,
  ExternalLink,
  X,
  Home,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FeedbackModal, FeedbackType } from "@/components/feedback/FeedbackModal";
import { HelpStepAnimation } from "@/components/help/HelpStepAnimation";
import {
  helpCategories,
  helpArticles,
  commonQuestions,
  troubleshootingGuides,
  type HelpArticle,
  type HelpCategory,
} from "@/lib/help-content";
import { smartHelpSearch, type SmartSearchResult } from "@/lib/help-search";
import { cn } from "@/lib/utils";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useDemoPath } from "@/hooks/use-demo-path";
import { useIsMobile } from "@/hooks/use-mobile";

type View =
  | { type: "home" }
  | { type: "category"; categoryId: string }
  | { type: "article"; articleId: string }
  | { type: "search"; query: string };

const HelpCenter = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getPath } = useDemoPath();
  const isMobile = useIsMobile();
  const initialArticle = searchParams.get("article");

  const [view, setView] = useState<View>(
    initialArticle ? { type: "article", articleId: initialArticle } : { type: "home" }
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const searchResults = useMemo(() => {
    return smartHelpSearch(searchQuery);
  }, [searchQuery]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (q.trim()) {
      setView({ type: "search", query: q });
    } else if (view.type === "search") {
      setView({ type: "home" });
    }
  }, [view.type]);

  const goHome = () => {
    setView({ type: "home" });
    setSearchQuery("");
  };

  const getArticle = (id: string) => helpArticles.find(a => a.id === id);
  const getCategory = (id: string) => helpCategories.find(c => c.id === id);
  const getCategoryArticles = (categoryId: string) => helpArticles.filter(a => a.categoryId === categoryId);

  // Current category context for sidebar highlighting
  const activeCategoryId = useMemo(() => {
    if (view.type === "category") return view.categoryId;
    if (view.type === "article") return getArticle(view.articleId)?.categoryId || null;
    return null;
  }, [view]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar with back-to-app button */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-3 h-14">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="h-5 w-px bg-border/50 shrink-0" />

          <button onClick={goHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <h1 className="text-base font-semibold text-foreground">Help Center</h1>
          </button>

          {/* Breadcrumb trail */}
          {view.type !== "home" && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground overflow-hidden">
              <ChevronRight className="h-3 w-3 shrink-0" />
              {view.type === "category" && (
                <span className="truncate font-medium text-foreground/80">
                  {getCategory(view.categoryId)?.title}
                </span>
              )}
              {view.type === "article" && (
                <>
                  <button
                    onClick={() => {
                      const article = getArticle(view.articleId);
                      if (article) setView({ type: "category", categoryId: article.categoryId });
                    }}
                    className="truncate hover:text-foreground transition-colors"
                  >
                    {getCategory(getArticle(view.articleId)?.categoryId || "")?.title}
                  </button>
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  <span className="truncate font-medium text-foreground/80">
                    {getArticle(view.articleId)?.title}
                  </span>
                </>
              )}
              {view.type === "search" && (
                <span className="truncate">Search results</span>
              )}
            </div>
          )}
        </div>

        {/* Mobile: horizontal category scroll strip */}
        {isMobile && (
          <div className="border-t border-border/30">
            <ScrollArea className="w-full">
              <div className="flex gap-1 px-4 py-2">
                <button
                  onClick={goHome}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    view.type === "home"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Home className="h-3 w-3 inline mr-1" />
                  Home
                </button>
                {helpCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setView({ type: "category", categoryId: cat.id })}
                    className={cn(
                      "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                      activeCategoryId === cat.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {cat.title}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className={cn("flex gap-8", !isMobile && "items-start")}>
          {/* Desktop sidebar */}
          {!isMobile && (
            <aside className="w-56 shrink-0 sticky top-[4.5rem]">
              <nav className="space-y-1">
                <button
                  onClick={goHome}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left",
                    view.type === "home"
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Home className="h-4 w-4 shrink-0" />
                  Overview
                </button>

                <div className="py-2">
                  <p className="px-3 text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold mb-1">
                    Topics
                  </p>
                </div>

                {helpCategories.map(cat => {
                  const count = getCategoryArticles(cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setView({ type: "category", categoryId: cat.id })}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left group",
                        activeCategoryId === cat.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <cat.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{cat.title}</span>
                      <span className={cn(
                        "text-[10px] tabular-nums",
                        activeCategoryId === cat.id ? "text-primary/60" : "text-muted-foreground/40"
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </aside>
          )}

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder='Ask a question... (e.g. "How do I move items?")'
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-11 pr-10 h-11 rounded-xl border-border/50 bg-card shadow-sm text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={
                  view.type === "article" ? `a-${(view as any).articleId}` :
                  view.type === "category" ? `c-${(view as any).categoryId}` :
                  view.type
                }
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {view.type === "home" && (
                  <HomeView
                    onSelectCategory={(id) => setView({ type: "category", categoryId: id })}
                    onSelectArticle={(id) => setView({ type: "article", articleId: id })}
                    getCategoryArticles={getCategoryArticles}
                    onContactSupport={() => setFeedbackOpen(true)}
                    isMobile={isMobile}
                  />
                )}

                {view.type === "search" && (
                  <SearchView
                    results={searchResults}
                    onSelectArticle={(id) => setView({ type: "article", articleId: id })}
                  />
                )}

                {view.type === "category" && (
                  <CategoryView
                    category={getCategory(view.categoryId)!}
                    articles={getCategoryArticles(view.categoryId)}
                    onSelectArticle={(id) => setView({ type: "article", articleId: id })}
                  />
                )}

                {view.type === "article" && (
                  <ArticleView
                    article={getArticle(view.articleId)!}
                    onNavigate={(id) => setView({ type: "article", articleId: id })}
                    onBack={() => {
                      const article = getArticle(view.articleId);
                      if (article) setView({ type: "category", categoryId: article.categoryId });
                      else goHome();
                    }}
                    getCategoryArticles={getCategoryArticles}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <FeedbackModal
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        initialType={"feedback" as FeedbackType}
      />
    </div>
  );
};

export default HelpCenter;

// ─── Home View ─────────────────────────────────────────────────────────────

const HomeView = ({
  onSelectCategory,
  onSelectArticle,
  getCategoryArticles,
  onContactSupport,
  isMobile,
}: {
  onSelectCategory: (id: string) => void;
  onSelectArticle: (id: string) => void;
  getCategoryArticles: (id: string) => HelpArticle[];
  onContactSupport: () => void;
  isMobile: boolean;
}) => (
  <div className="space-y-10">
    {/* Quick Answers */}
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Quick Answers</h2>
      </div>
      <Accordion type="single" collapsible className="space-y-2">
        {commonQuestions.map((q, i) => (
          <AccordionItem
            key={i}
            value={`qa-${i}`}
            className="border rounded-xl px-4 bg-card hover:shadow-sm transition-all data-[state=open]:shadow-sm"
          >
            <AccordionTrigger className="text-left text-sm py-3.5 hover:no-underline gap-3 [&>svg]:text-primary/50">
              <span className="font-medium">{q.question}</span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
              {q.answer}
              {q.relatedArticleId && (
                <button
                  onClick={() => onSelectArticle(q.relatedArticleId!)}
                  className="block mt-2.5 text-primary text-xs font-medium hover:underline"
                >
                  Read full guide →
                </button>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>

    {/* Categories — only show on mobile since desktop has sidebar */}
    {isMobile && (
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Browse by Topic</h2>
        <div className="grid grid-cols-1 gap-3">
          {helpCategories.map((cat) => {
            const count = getCategoryArticles(cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className="group flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-md transition-all text-left"
              >
                <div className="p-2.5 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors shrink-0">
                  <cat.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{cat.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{cat.description}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1.5">{count} article{count !== 1 ? "s" : ""}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/50 transition-colors mt-0.5 shrink-0" />
              </button>
            );
          })}
        </div>
      </section>
    )}

    {/* Troubleshooting */}
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-4">Troubleshooting</h2>
      <div className="space-y-2">
        {troubleshootingGuides.map((item, i) => (
          <Card key={i} className="p-4 bg-card border-border/50">
            <p className="text-sm font-medium text-foreground mb-1">{item.issue}</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {item.symptoms.map((s, j) => (
                <Badge key={j} variant="secondary" className="text-[10px] font-normal">{s}</Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.solution}</p>
          </Card>
        ))}
      </div>
    </section>

    {/* Contact */}
    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30">
      <div className="flex items-center gap-2.5">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Can't find what you need?</span>
      </div>
      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onContactSupport}>
        Contact Support
      </Button>
    </div>
  </div>
);

// ─── Search View ───────────────────────────────────────────────────────────

const SearchView = ({
  results,
  onSelectArticle,
}: {
  results: SmartSearchResult;
  onSelectArticle: (id: string) => void;
}) => {
  const total = results.articles.length + results.questions.length;
  if (total === 0) {
    return (
      <div className="text-center py-16">
        <Search className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No results found</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Try rephrasing your question or browse categories</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">{total} result{total !== 1 ? "s" : ""} found</p>

      {results.bestMatch && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <p className="text-[11px] uppercase tracking-wider text-primary font-semibold">Best Match</p>
          </div>
          <button
            onClick={() => onSelectArticle(results.bestMatch!.id)}
            className="w-full text-left p-4 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{results.bestMatch.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{results.bestMatch.summary}</p>
                {results.matchReason && (
                  <p className="text-[10px] text-primary/70 mt-1.5 font-medium">{results.matchReason}</p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-primary/40 group-hover:text-primary shrink-0 mt-1" />
            </div>
          </button>
        </div>
      )}

      {results.articles.length > 1 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">More Articles</p>
          {results.articles.slice(1).map(a => (
            <ArticleRow key={a.id} article={a} onClick={() => onSelectArticle(a.id)} />
          ))}
        </div>
      )}

      {results.questions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Quick Answers</p>
          <Accordion type="single" collapsible className="space-y-1.5">
            {results.questions.map((q, i) => (
              <AccordionItem
                key={i}
                value={`sq-${i}`}
                className="border rounded-xl px-4 bg-card hover:shadow-sm transition-all"
              >
                <AccordionTrigger className="text-left text-sm py-3 hover:no-underline [&>svg]:text-primary/50">
                  <span className="font-medium">{q.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-3 leading-relaxed">
                  {q.answer}
                  {q.relatedArticleId && (
                    <button
                      onClick={() => onSelectArticle(q.relatedArticleId!)}
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
      )}
    </div>
  );
};

// ─── Article Row ───────────────────────────────────────────────────────────

const ArticleRow = ({ article, onClick }: { article: HelpArticle; onClick: () => void }) => {
  const cat = helpCategories.find(c => c.id === article.categoryId);
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border/40 bg-card hover:border-primary/20 hover:shadow-sm transition-all text-left group"
    >
      {cat && (
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <cat.icon className="h-4 w-4 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{article.title}</p>
        <p className="text-xs text-muted-foreground truncate">{article.summary}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary/50 shrink-0" />
    </button>
  );
};

// ─── Category View ─────────────────────────────────────────────────────────

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
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{category.title}</h2>
          <p className="text-sm text-muted-foreground">{category.description}</p>
        </div>
      </div>

      <div className="space-y-2">
        {articles.map(a => (
          <ArticleRow key={a.id} article={a} onClick={() => onSelectArticle(a.id)} />
        ))}
      </div>

      {articles.length === 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">No articles in this category yet.</div>
      )}
    </div>
  );
};

// ─── Article View with Pagination ──────────────────────────────────────────

const ArticleView = ({
  article,
  onNavigate,
  onBack,
  getCategoryArticles,
}: {
  article: HelpArticle;
  onNavigate: (id: string) => void;
  onBack: () => void;
  getCategoryArticles: (categoryId: string) => HelpArticle[];
}) => {
  const cat = helpCategories.find(c => c.id === article.categoryId);
  const navigate = useNavigate();
  const { getPath } = useDemoPath();

  // Compute prev/next articles within the same category
  const siblings = getCategoryArticles(article.categoryId);
  const currentIndex = siblings.findIndex(a => a.id === article.id);
  const prevArticle = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const nextArticle = currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

  const relatedArticles = (article.relatedArticles || [])
    .map(id => helpArticles.find(a => a.id === id))
    .filter(Boolean) as HelpArticle[];

  return (
    <div className="space-y-8">
      {/* Header with progress indicator */}
      <div>
        {cat && (
          <button
            onClick={onBack}
            className="text-xs text-primary font-medium mb-2.5 flex items-center gap-1 hover:underline"
          >
            <cat.icon className="h-3.5 w-3.5" />
            {cat.title}
          </button>
        )}
        <h2 className="text-xl font-semibold leading-tight">{article.title}</h2>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{article.summary}</p>

        <div className="flex items-center gap-2.5 mt-3">
          <Badge variant="secondary" className="text-xs gap-1">
            <BookOpen className="h-3 w-3" />
            {article.steps.length} steps
          </Badge>
          {article.tips && article.tips.length > 0 && (
            <Badge variant="outline" className="text-xs gap-1 text-warning border-warning/30">
              <Lightbulb className="h-3 w-3" />
              {article.tips.length} tips
            </Badge>
          )}
          {siblings.length > 1 && (
            <span className="text-[10px] text-muted-foreground/50 ml-auto">
              {currentIndex + 1} of {siblings.length} in {cat?.title}
            </span>
          )}
        </div>
      </div>

      {/* Visual Step Guide */}
      <HelpStepAnimation
        steps={article.steps}
        stepTitles={article.stepTitles}
        articleId={article.id}
      />

      {/* Tips & Best Practices */}
      {article.tips && article.tips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-warning/15 bg-gradient-to-br from-warning/[0.04] to-transparent p-5 space-y-4"
        >
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-warning/10">
              <Lightbulb className="h-4 w-4 text-warning" />
            </span>
            Tips & Best Practices
          </p>
          <div className="grid gap-3">
            {article.tips.map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/30 hover:border-warning/20 hover:shadow-sm transition-all"
              >
                <CheckCircle2 className="h-4 w-4 text-primary/60 shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground leading-relaxed">{tip}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Try It Now */}
      {article.actionRoute && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="group relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/[0.05] to-primary/[0.02] p-5"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Ready to try it yourself?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Put what you've learned into practice — we'll highlight where to start.
              </p>
            </div>
            <Button
              size="sm"
              className="gap-1.5 shadow-sm shadow-primary/10 hover:shadow-md hover:shadow-primary/15 transition-all"
              onClick={() => navigate(getPath(article.actionRoute!))}
            >
              {article.actionLabel || "Try it now"}
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Prev / Next pagination */}
      {(prevArticle || nextArticle) && (
        <div className="flex items-stretch gap-3 pt-4 border-t border-border/30">
          {prevArticle ? (
            <button
              onClick={() => onNavigate(prevArticle.id)}
              className="flex-1 flex items-center gap-3 p-4 rounded-xl border border-border/40 bg-card hover:border-primary/20 hover:shadow-sm transition-all text-left group"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">Previous</p>
                <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground truncate mt-0.5">
                  {prevArticle.title}
                </p>
              </div>
            </button>
          ) : (
            <div className="flex-1" />
          )}
          {nextArticle ? (
            <button
              onClick={() => onNavigate(nextArticle.id)}
              className="flex-1 flex items-center justify-end gap-3 p-4 rounded-xl border border-border/40 bg-card hover:border-primary/20 hover:shadow-sm transition-all text-right group"
            >
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium">Next</p>
                <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground truncate mt-0.5">
                  {nextArticle.title}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary shrink-0" />
            </button>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      )}

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <div className="space-y-3 pt-5 border-t border-border/30">
          <p className="text-xs uppercase tracking-wider text-muted-foreground/60 font-medium">Related Articles</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {relatedArticles.map((ra, i) => (
              <motion.button
                key={ra.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                onClick={() => onNavigate(ra.id)}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/40 hover:border-primary/20 hover:shadow-sm transition-all text-left group"
              >
                <BookOpen className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground truncate flex-1">
                  {ra.title}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary/50 shrink-0 transition-colors" />
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
