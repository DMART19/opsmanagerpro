import { useState } from "react";
import { Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CertificationModal } from "./CertificationModal";
import { toast } from "sonner";

const mockCertifications = [
  {
    id: "1",
    type: "Forklift Operator",
    description: "Certified to operate warehouse forklifts",
    validityPeriod: "2 years",
    holders: ["Sarah Martinez", "John Davis", "Michael Brown"],
    expiringCount: 1,
    status: "expiring",
  },
  {
    id: "2",
    type: "Hazmat Handler",
    description: "Certified for hazardous materials handling",
    validityPeriod: "1 year",
    holders: ["Sarah Martinez", "Robert Chen", "Lisa Wong"],
    expiringCount: 0,
    status: "valid",
  },
  {
    id: "3",
    type: "Safety Inspector",
    description: "Qualified to conduct safety inspections",
    validityPeriod: "3 years",
    holders: ["Sarah Martinez", "Robert Chen"],
    expiringCount: 0,
    status: "valid",
  },
  {
    id: "4",
    type: "Equipment Maintenance",
    description: "Certified for equipment maintenance and repair",
    validityPeriod: "2 years",
    holders: ["James Wilson", "Mike Thompson"],
    expiringCount: 1,
    status: "expiring",
  },
  {
    id: "5",
    type: "First Aid",
    description: "CPR and First Aid certification",
    validityPeriod: "2 years",
    holders: ["Robert Chen", "Lisa Wong", "Maria Garcia", "Emily Davis"],
    expiringCount: 0,
    status: "valid",
  },
  {
    id: "6",
    type: "Electrical Safety",
    description: "Certified for electrical equipment work",
    validityPeriod: "1 year",
    holders: ["James Wilson"],
    expiringCount: 1,
    status: "expired",
  },
  {
    id: "7",
    type: "Inventory Management",
    description: "Certified for inventory control and management",
    validityPeriod: "3 years",
    holders: ["Maria Garcia", "David Park", "Jennifer Lee"],
    expiringCount: 0,
    status: "valid",
  },
  {
    id: "8",
    type: "Quality Control",
    description: "Qualified for quality assurance inspections",
    validityPeriod: "2 years",
    holders: ["Maria Garcia", "Robert Chen"],
    expiringCount: 2,
    status: "expiring",
  },
];

export const Certifications = () => {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);

  const filteredCertifications = mockCertifications.filter((cert) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "valid") return cert.status === "valid";
    if (activeFilter === "expiring") return cert.status === "expiring";
    if (activeFilter === "expired") return cert.status === "expired";
    return true;
  });

  const getStatusBadge = (status: string, expiringCount: number) => {
    if (status === "expired") {
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20">
          Expired
        </Badge>
      );
    }
    if (status === "expiring") {
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20">
          {expiringCount} Expiring Soon
        </Badge>
      );
    }
    return (
      <Badge className="bg-success/10 text-success border-success/20">
        Valid
      </Badge>
    );
  };

  const handleExport = () => {
    toast.success("Certification report exported successfully");
  };

  return (
    <>
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Certification Management</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Track employee certifications and expiration dates
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export Report</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <Button onClick={() => setModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Assign Certification
              </Button>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={activeFilter === "all" ? "default" : "outline"}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setActiveFilter("all")}
            >
              All
            </Badge>
            <Badge
              variant={activeFilter === "valid" ? "default" : "outline"}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setActiveFilter("valid")}
            >
              Valid
            </Badge>
            <Badge
              variant={activeFilter === "expiring" ? "default" : "outline"}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setActiveFilter("expiring")}
            >
              Expiring Soon
            </Badge>
            <Badge
              variant={activeFilter === "expired" ? "default" : "outline"}
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => setActiveFilter("expired")}
            >
              Expired
            </Badge>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block rounded-xl border overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold">Certification Type</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="font-semibold">Validity Period</TableHead>
                <TableHead className="font-semibold">Assigned Employees</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCertifications.map((cert, index) => (
                <TableRow 
                  key={cert.id}
                  className={`hover:bg-accent/5 transition-colors ${
                    index % 2 === 0 ? "bg-background" : "bg-muted/20"
                  }`}
                >
                  <TableCell className="font-medium">{cert.type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs">
                    {cert.description}
                  </TableCell>
                  <TableCell className="text-sm">{cert.validityPeriod}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {cert.holders.slice(0, 2).map((holder, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {holder}
                        </Badge>
                      ))}
                      {cert.holders.length > 2 && (
                        <Badge variant="outline" className="text-xs font-semibold">
                          +{cert.holders.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(cert.status, cert.expiringCount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3">
          {filteredCertifications.map((cert) => (
            <Card key={cert.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-base mb-1">{cert.type}</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {cert.description}
                  </p>
                </div>
                {getStatusBadge(cert.status, cert.expiringCount)}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Validity:</span>
                  <span className="font-medium">{cert.validityPeriod}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Employees:</span>
                  <span className="font-medium">{cert.holders.length}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t">
                <div className="flex flex-wrap gap-1">
                  {cert.holders.slice(0, 3).map((holder, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {holder.split(" ")[0]}
                    </Badge>
                  ))}
                  {cert.holders.length > 3 && (
                    <Badge variant="outline" className="text-xs font-semibold">
                      +{cert.holders.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6 text-sm text-muted-foreground">
          Showing {filteredCertifications.length} of {mockCertifications.length} certifications
        </div>
      </Card>

      <CertificationModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
};