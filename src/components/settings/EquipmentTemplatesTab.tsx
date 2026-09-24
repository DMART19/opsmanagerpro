import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Wrench, Edit, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const mockTemplates = [
  {
    id: "1",
    name: "Laptop Computer",
    category: "Electronics",
    requiredCerts: ["IT Security Training"],
    serviceInterval: 180,
    calibrationRequired: false,
  },
  {
    id: "2",
    name: "Conference Room Projector",
    category: "AV Equipment",
    requiredCerts: ["AV Setup Training"],
    serviceInterval: 120,
    calibrationRequired: true,
  },
  {
    id: "3",
    name: "Standing Desk",
    category: "Furniture",
    requiredCerts: [],
    serviceInterval: 365,
    calibrationRequired: false,
  },
  {
    id: "4",
    name: "Network Printer",
    category: "Office Equipment",
    requiredCerts: [],
    serviceInterval: 90,
    calibrationRequired: false,
  },
];

export const EquipmentTemplatesTab = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Template saved",
      description: "Equipment template has been created successfully.",
    });
    setModalOpen(false);
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Equipment Templates</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Define master equipment types with requirements and service schedules
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Template
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Required Certifications</TableHead>
                <TableHead>Service Interval</TableHead>
                <TableHead>Calibration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{template.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {template.requiredCerts.slice(0, 2).map((cert, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {cert}
                        </Badge>
                      ))}
                      {template.requiredCerts.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.requiredCerts.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      Every {template.serviceInterval} days
                    </div>
                  </TableCell>
                  <TableCell>
                    {template.calibrationRequired ? (
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        Required
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Not required</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Equipment Template</DialogTitle>
            <DialogDescription>
              Define a new equipment type with requirements and maintenance schedules
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Asset Name</Label>
                <Input id="template-name" placeholder="e.g., Laptop Computer" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" placeholder="e.g., Power" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Detailed description of the equipment..." rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="service-interval">Service Interval (days)</Label>
                <Input id="service-interval" type="number" placeholder="90" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calibration-interval">Calibration Interval (days)</Label>
                <Input id="calibration-interval" type="number" placeholder="365" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Required Certifications</Label>
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">Equipment Operation</span>
                  <Button variant="ghost" size="sm">Remove</Button>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="h-3 w-3" />
                  Add Certification
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
