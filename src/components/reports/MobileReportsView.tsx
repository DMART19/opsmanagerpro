import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ShieldCheck, CheckCircle2, Clock, ChevronRight, TrendingUp, TrendingDown, AlertTriangle, FileCheck, Table, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import { ChartSkeleton } from "./ChartSkeleton";
import { CertificationTrendsChart } from "./CertificationTrendsChart";
import { EquipmentUtilizationChart } from "./EquipmentUtilizationChart";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useTourMode } from "@/contexts/TourModeContext";
interface MobileKPICardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  status: 'healthy' | 'attention' | 'critical';
  onClick?: () => void;
  subtext?: string;
}
const MobileKPICard = ({
  icon: Icon,
  label,
  value,
  unit = '%',
  trend,
  status,
  onClick,
  subtext
}: MobileKPICardProps) => {
  const statusColors = {
    healthy: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
    attention: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
    critical: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
  };
  const iconColors = {
    healthy: 'text-green-600',
    attention: 'text-amber-600',
    critical: 'text-red-600'
  };
  return <button onClick={onClick} className={cn("p-3 rounded-xl border-2 text-left w-full transition-all active:scale-[0.98]", statusColors[status])}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <Icon className={cn("h-4 w-4", iconColors[status])} />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{value}</span>
            <span className="text-sm text-muted-foreground">{unit}</span>
          </div>
          {subtext && <p className="text-[10px] text-muted-foreground mt-0.5">{subtext}</p>}
        </div>
        {trend !== undefined && <div className={cn("flex items-center gap-0.5 text-xs font-medium", trend > 0 ? "text-green-600" : "text-amber-600")}>
            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend > 0 ? '+' : ''}{trend}%
          </div>}
        <ChevronRight className="h-4 w-4 text-muted-foreground ml-2" />
      </div>
    </button>;
};
interface ActionItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  status: 'action' | 'info' | 'success';
  onClick?: () => void;
}
const ActionItem = ({
  icon: Icon,
  title,
  description,
  status,
  onClick
}: ActionItemProps) => {
  const statusColors = {
    action: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    info: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    success: 'text-green-600 bg-green-100 dark:bg-green-900/30'
  };
  return <button onClick={onClick} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors w-full text-left">
      <div className={cn("p-2 rounded-lg", statusColors[status])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>;
};
export const MobileReportsView = () => {
  const navigate = useNavigate();
  const {
    checkRestriction
  } = useTourMode();
  const [exportSheetOpen, setExportSheetOpen] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const handleExport = (type: 'pdf' | 'csv') => {
    if (checkRestriction('export')) return;
    setExportSheetOpen(false);
    toast({
      title: type === 'pdf' ? "Generating PDF" : "Preparing CSV",
      description: "Your export will be ready shortly."
    });
  };
  return <div className="space-y-4 pb-20">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Reports</h1>
          <p className="text-xs text-muted-foreground">System health overview</p>
        </div>
        <Sheet open={exportSheetOpen} onOpenChange={setExportSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileCheck className="h-4 w-4" />
              Export
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle>Export Report</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => handleExport('csv')}>
                <Table className="h-6 w-6" />
                <span>CSV Data</span>
              </Button>
              <Button className="h-20 flex-col gap-2" onClick={() => handleExport('pdf')}>
                <FileCheck className="h-6 w-6" />
                <span>Audit PDF</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Health Score */}
      

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-2">
        <MobileKPICard icon={Package} label="Availability" value={71.4} trend={3.2} status="healthy" onClick={() => navigate('/inventory?status=available')} />
        <MobileKPICard icon={ShieldCheck} label="Risk Items" value={19} unit=" items" status="attention" subtext="5 overdue" onClick={() => navigate('/people?tab=compliance')} />
        <MobileKPICard icon={CheckCircle2} label="Completion" value={84.2} trend={-2.1} status="healthy" onClick={() => navigate('/calendar?view=month')} />
        <MobileKPICard icon={Clock} label="Resolution" value={3.8} unit=" days" trend={-0.5} status="healthy" onClick={() => navigate('/calendar?view=list')} />
      </div>

      {/* Actions Needed */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Actions Needed</h3>
          <Badge variant="secondary" className="text-xs">3 items</Badge>
        </div>
        <div className="space-y-1">
          <ActionItem icon={AlertTriangle} title="5 items overdue" description="Review and update credentials" status="action" onClick={() => navigate('/people?tab=compliance&status=overdue')} />
          <ActionItem icon={Clock} title="14 approaching deadline" description="Items due this month" status="info" onClick={() => navigate('/people?tab=compliance&status=expiring')} />
          <ActionItem icon={TrendingUp} title="Resolution time improved" description="12% faster than last month" status="success" />
        </div>
      </Card>

      {/* Quick Stats */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Performance Summary</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Compliant Items</span>
            <span className="font-semibold text-green-600">153</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{
            width: '89%'
          }} />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>89% compliance rate</span>
            <span>Target: 95%</span>
          </div>
        </div>
      </Card>

      {/* Expandable Charts Section */}
      <Button variant="outline" className="w-full gap-2" onClick={() => setShowCharts(!showCharts)}>
        <BarChart3 className="h-4 w-4" />
        {showCharts ? 'Hide Detailed Charts' : 'View Detailed Charts'}
        {showCharts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {showCharts && <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
          <Suspense fallback={<ChartSkeleton type="bar" height={300} />}>
            <CertificationTrendsChart />
          </Suspense>
          <Suspense fallback={<ChartSkeleton type="pie" height={300} />}>
            <EquipmentUtilizationChart />
          </Suspense>
        </div>}
    </div>;
};