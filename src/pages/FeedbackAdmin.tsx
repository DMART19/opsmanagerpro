import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { LegalFooter } from '@/components/LegalFooter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, MessageSquare, Mail, TrendingUp, Search, Filter, LogOut, Inbox, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useFeedbackAnalytics, FeedbackRecord } from '@/hooks/use-feedback-analytics';
import { useSupportMessages, SupportMessage } from '@/hooks/use-support-messages';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CHART_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
const TAG_COLORS: Record<string, string> = {
  'Confusing': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'Slow': 'bg-red-500/10 text-red-600 border-red-500/20',
  'Missing feature': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Bug': 'bg-red-500/10 text-red-600 border-red-500/20',
  'Looks good': 'bg-green-500/10 text-green-600 border-green-500/20',
  'Hard to understand': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  // Bug report tags
  'Crash': 'bg-red-500/10 text-red-600 border-red-500/20',
  'UI Issue': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'Data Issue': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  'Performance': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Login/Auth': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  // Feature request tags
  'Workflow': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  'Integration': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  'Reporting': 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  'Mobile': 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  'Automation': 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  'Other': 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  // Type tags
  'type:feedback': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'type:bug': 'bg-red-500/10 text-red-600 border-red-500/20',
  'type:feature': 'bg-green-500/10 text-green-600 border-green-500/20',
};

const STATUS_COLORS: Record<string, string> = {
  'open': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  'in_progress': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'resolved': 'bg-green-500/10 text-green-600 border-green-500/20',
  'closed': 'bg-muted text-muted-foreground border-muted',
};

const RatingStars = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(star => (
      <Star
        key={star}
        className={cn(
          'h-4 w-4',
          star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20'
        )}
      />
    ))}
  </div>
);

const StatCard = ({ title, value, subtitle, icon: Icon }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
}) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const FeedbackAdmin = () => {
  const navigate = useNavigate();
  const { data: feedbackData, isLoading: feedbackLoading, error: feedbackError } = useFeedbackAnalytics();
  const { data: supportData, isLoading: supportLoading, error: supportError } = useSupportMessages();
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [featureFilter, setFeatureFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [supportSearch, setSupportSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth', { replace: true });
  };

  const filteredRecords = useMemo(() => {
    if (!feedbackData?.records) return [];
    
    return feedbackData.records.filter(record => {
      const matchesSearch = !searchQuery || 
        record.feedback_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesRating = ratingFilter === 'all' || record.rating === parseInt(ratingFilter);
      const matchesFeature = featureFilter === 'all' || record.feature_name === featureFilter;
      
      // Filter by type tag
      const recordType = record.tags?.find(t => t.startsWith('type:'))?.replace('type:', '') || 'feedback';
      const matchesType = typeFilter === 'all' || recordType === typeFilter;

      return matchesSearch && matchesRating && matchesFeature && matchesType;
    });
  }, [feedbackData?.records, searchQuery, ratingFilter, featureFilter, typeFilter]);

  const filteredSupportMessages = useMemo(() => {
    if (!supportData?.messages) return [];
    
    return supportData.messages.filter(message => {
      const matchesSearch = !supportSearch || 
        message.name.toLowerCase().includes(supportSearch.toLowerCase()) ||
        message.email.toLowerCase().includes(supportSearch.toLowerCase()) ||
        message.subject.toLowerCase().includes(supportSearch.toLowerCase()) ||
        message.message.toLowerCase().includes(supportSearch.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || message.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [supportData?.messages, supportSearch, statusFilter]);

  const ratingChartData = useMemo(() => {
    if (!feedbackData?.stats) return [];
    return Object.entries(feedbackData.stats.ratingDistribution).map(([rating, count]) => ({
      name: `${rating} Star`,
      value: count,
      rating: parseInt(rating),
    }));
  }, [feedbackData?.stats]);

  const tagChartData = useMemo(() => {
    if (!feedbackData?.stats) return [];
    return Object.entries(feedbackData.stats.tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ name: tag, count }));
  }, [feedbackData?.stats]);

  const featureOptions = useMemo(() => {
    if (!feedbackData?.stats) return [];
    return Object.keys(feedbackData.stats.featureCounts).sort();
  }, [feedbackData?.stats]);

  const isLoading = feedbackLoading || supportLoading;
  const hasError = feedbackError || supportError;

  if (hasError) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Failed to load data. You may not have admin access.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Feedback & Support</h1>
            <p className="text-muted-foreground">Manage user feedback and support messages</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/inbox')} className="gap-2">
              <Inbox className="h-4 w-4" />
              Messages Inbox
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          ) : (
            <>
              <StatCard
                title="Total Feedback"
                value={feedbackData?.stats.totalCount || 0}
                icon={MessageSquare}
              />
              <StatCard
                title="Average Rating"
                value={(feedbackData?.stats.averageRating || 0).toFixed(1)}
                subtitle="out of 5 stars"
                icon={Star}
              />
              <StatCard
                title="Feedback Emails"
                value={feedbackData?.stats.feedbackWithEmail || 0}
                subtitle="want follow-up"
                icon={Mail}
              />
              <StatCard
                title="Support Messages"
                value={supportData?.stats.totalCount || 0}
                subtitle={`${supportData?.stats.openCount || 0} open`}
                icon={Inbox}
              />
              <StatCard
                title="Resolved"
                value={supportData?.stats.resolvedCount || 0}
                subtitle="support tickets"
                icon={CheckCircle2}
              />
            </>
          )}
        </div>

        <Tabs defaultValue="feedback" className="space-y-6">
          <TabsList>
            <TabsTrigger value="feedback" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Feedback
              <Badge variant="secondary" className="ml-1">{feedbackData?.stats.totalCount || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-2">
              <Inbox className="h-4 w-4" />
              Support
              <Badge variant="secondary" className="ml-1">{supportData?.stats.totalCount || 0}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feedback" className="space-y-6">
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Rating Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[200px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={ratingChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                        >
                          {ratingChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[entry.rating - 1]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Common Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[200px] w-full" />
                  ) : tagChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={tagChartData} layout="vertical">
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No tags yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search feedback, emails, or tags..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                      <SelectItem value="bug">Bug Reports</SelectItem>
                      <SelectItem value="feature">Feature Requests</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={ratingFilter} onValueChange={setRatingFilter}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ratings</SelectItem>
                      {[5, 4, 3, 2, 1].map(r => (
                        <SelectItem key={r} value={r.toString()}>{r} Star{r !== 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={featureFilter} onValueChange={setFeatureFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Feature" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Features</SelectItem>
                      {featureOptions.map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Feedback Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Feedback Entries
                  <Badge variant="secondary" className="ml-2">{filteredRecords.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {isLoading ? (
                    <div className="space-y-4">
                      {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                  ) : filteredRecords.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No feedback entries found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Type</TableHead>
                          <TableHead className="w-[100px]">Rating</TableHead>
                          <TableHead className="w-[120px]">Feature</TableHead>
                          <TableHead>Tags</TableHead>
                          <TableHead>Feedback</TableHead>
                          <TableHead className="w-[180px]">Email</TableHead>
                          <TableHead className="w-[140px]">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRecords.map((record: FeedbackRecord) => {
                          const typeTag = record.tags?.find(t => t.startsWith('type:'));
                          const feedbackType = typeTag?.replace('type:', '') || 'feedback';
                          const displayTags = record.tags?.filter(t => !t.startsWith('type:')) || [];
                          
                          return (
                            <TableRow key={record.id}>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={cn('text-xs capitalize', TAG_COLORS[typeTag || 'type:feedback'] || '')}
                                >
                                  {feedbackType === 'bug' ? '🐛 Bug' : feedbackType === 'feature' ? '💡 Feature' : '💬 Feedback'}
                                </Badge>
                              </TableCell>
                              <TableCell><RatingStars rating={record.rating} /></TableCell>
                              <TableCell className="text-sm">{record.feature_name || 'General'}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {displayTags.map(tag => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className={cn('text-xs', TAG_COLORS[tag] || '')}
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[300px]">
                                <p className="text-sm truncate" title={record.feedback_text || undefined}>
                                  {record.feedback_text || <span className="text-muted-foreground italic">No comment</span>}
                                </p>
                              </TableCell>
                              <TableCell>
                                {record.email ? (
                                  <a href={`mailto:${record.email}`} className="text-sm text-primary hover:underline">
                                    {record.email}
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(record.created_at), 'MMM d, yyyy h:mm a')}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            {/* Support Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search name, email, subject, or message..."
                      value={supportSearch}
                      onChange={e => setSupportSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Support Messages Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Support Messages
                  <Badge variant="secondary" className="ml-2">{filteredSupportMessages.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {supportLoading ? (
                    <div className="space-y-4">
                      {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                  ) : filteredSupportMessages.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No support messages found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Status</TableHead>
                          <TableHead className="w-[150px]">Name</TableHead>
                          <TableHead className="w-[200px]">Email</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Message</TableHead>
                          <TableHead className="w-[140px]">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSupportMessages.map((message: SupportMessage) => (
                          <TableRow key={message.id}>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn('text-xs capitalize', STATUS_COLORS[message.status] || '')}
                              >
                                {message.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm font-medium">{message.name}</TableCell>
                            <TableCell>
                              <a href={`mailto:${message.email}`} className="text-sm text-primary hover:underline">
                                {message.email}
                              </a>
                            </TableCell>
                            <TableCell className="text-sm font-medium">{message.subject}</TableCell>
                            <TableCell className="max-w-[300px]">
                              <p className="text-sm truncate" title={message.message}>
                                {message.message}
                              </p>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(message.created_at), 'MMM d, yyyy h:mm a')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      <LegalFooter />
    </div>
  );
};

export default FeedbackAdmin;
