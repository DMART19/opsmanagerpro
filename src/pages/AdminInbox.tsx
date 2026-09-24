import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { LegalFooter } from '@/components/LegalFooter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Inbox, Search, LogOut, Clock, Eye, Filter, RefreshCw, StickyNote, BarChart3, CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  useAdminMessages, useUpdateMessageStatus,
  AdminMessage, MessageStatus,
} from '@/hooks/use-admin-messages';
import { TYPE_CONFIG, STATUS_CONFIG } from '@/components/admin/inbox/inbox-config';
import { MessageCard } from '@/components/admin/inbox/MessageCard';
import { MessageFullScreen } from '@/components/admin/inbox/MessageFullScreen';

/* ── Stat card ── */
const StatCard = ({ title, value, subtitle, icon: Icon }: {
  title: string; value: string | number; subtitle?: string; icon: React.ElementType;
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

/* ── Desktop modal ── */
const DesktopMessageModal = ({ message, open, onOpenChange, onUpdateStatus }: {
  message: AdminMessage | null; open: boolean;
  onOpenChange: (o: boolean) => void;
  onUpdateStatus: (id: string, status: MessageStatus, notes?: string) => void;
}) => {
  const [notes, setNotes] = useState(message?.admin_notes || '');
  const [newStatus, setNewStatus] = useState<MessageStatus>(message?.status || 'new');

  if (!message) return null;
  const typeConfig = TYPE_CONFIG[message.type];
  const TypeIcon = typeConfig.icon;

  const handleSave = () => { onUpdateStatus(message.id, newStatus, notes); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn('h-10 w-10 rounded-full flex items-center justify-center', typeConfig.color)}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{typeConfig.label}</DialogTitle>
              <DialogDescription>
                Submitted {format(new Date(message.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                {message.page_context && ` • From: ${message.page_context}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Message</p>
            <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">{message.message}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as MessageStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([value, config]) => {
                    const StatusIcon = config.icon;
                    return (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2"><StatusIcon className="h-4 w-4" /><span>{config.label}</span></div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <StickyNote className="h-4 w-4" /> Internal Notes (Admin Only)
            </p>
            <Textarea placeholder="Add internal notes..." value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[100px] resize-none" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ── Main page ── */
const AdminInboxContent = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data, isLoading, error, refetch } = useAdminMessages();
  const updateStatus = useUpdateMessageStatus();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<AdminMessage | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/auth', { replace: true }); };
  const handleUpdateStatus = (id: string, status: MessageStatus, notes?: string) => {
    updateStatus.mutate({ id, status, admin_notes: notes });
  };

  const filteredMessages = useMemo(() => {
    if (!data?.messages) return [];
    return data.messages.filter(message => {
      const matchesSearch = !searchQuery ||
        message.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        message.page_context?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || message.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || message.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [data?.messages, searchQuery, typeFilter, statusFilter]);

  /* Mobile full-screen detail */
  if (isMobile && selectedMessage) {
    return (
      <MessageFullScreen
        message={selectedMessage}
        onBack={() => setSelectedMessage(null)}
        onUpdateStatus={handleUpdateStatus}
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">Failed to load messages. You may not have admin access.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <Inbox className="h-7 w-7 sm:h-8 sm:w-8" />
              Admin Inbox
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Review and manage user messages</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!isMobile && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/ops')} className="gap-2">
                  <BarChart3 className="h-4 w-4" /> Ops Center
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/feedback')} className="gap-2">
                  <BarChart3 className="h-4 w-4" /> Analytics
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => (
              <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          ) : (
            <>
              <StatCard title="Total" value={data?.stats.totalCount || 0} icon={Inbox} />
              <StatCard title="New" value={data?.stats.newCount || 0} subtitle="Awaiting review" icon={Clock} />
              <StatCard title="Reviewed" value={data?.stats.reviewedCount || 0} subtitle="In progress" icon={Eye} />
              <StatCard title="Resolved" value={data?.stats.resolvedCount || 0} icon={CheckCircle2} />
            </>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-4 sm:mb-6">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search messages..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-11" />
              </div>
              <div className="flex gap-3">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[160px] h-11">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(TYPE_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[160px] h-11">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                      <SelectItem key={value} value={value}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              Messages <Badge variant="secondary">{filteredMessages.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No messages found</p>
              </div>
            ) : isMobile ? (
              /* ─── Mobile: card list ─── */
              <div className="space-y-2">
                {filteredMessages.map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    onClick={() => setSelectedMessage(message)}
                  />
                ))}
              </div>
            ) : (
              /* ─── Desktop: table ─── */
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Type</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="w-[100px]">Page</TableHead>
                      <TableHead className="w-[140px]">Date</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMessages.map((message) => {
                      const typeConfig = TYPE_CONFIG[message.type];
                      const statusConfig = STATUS_CONFIG[message.status];
                      const TypeIcon = typeConfig.icon;
                      const StatusIcon = statusConfig.icon;
                      return (
                        <TableRow
                          key={message.id}
                          className={cn('cursor-pointer hover:bg-muted/50', message.status === 'new' && 'bg-yellow-500/5')}
                          onClick={() => { setSelectedMessage(message); setDetailOpen(true); }}
                        >
                          <TableCell>
                            <Badge variant="outline" className={cn('gap-1', typeConfig.color)}>
                              <TypeIcon className="h-3 w-3" />{typeConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('gap-1', statusConfig.color)}>
                              <StatusIcon className="h-3 w-3" />{statusConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="truncate max-w-[300px] text-sm">{message.message}</p>
                            {message.admin_notes && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <StickyNote className="h-3 w-3" /> Has notes
                              </p>
                            )}
                          </TableCell>
                          <TableCell><span className="text-sm text-muted-foreground">{message.page_context || '-'}</span></TableCell>
                          <TableCell><span className="text-sm text-muted-foreground">{format(new Date(message.created_at), 'MMM d, yyyy')}</span></TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedMessage(message); setDetailOpen(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Desktop dialog */}
        {!isMobile && (
          <DesktopMessageModal
            message={selectedMessage}
            open={detailOpen}
            onOpenChange={setDetailOpen}
            onUpdateStatus={handleUpdateStatus}
          />
        )}
      </main>
      <LegalFooter />
    </div>
  );
};

export default AdminInboxContent;
