import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LegalFooter } from "@/components/LegalFooter";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Upload,
  X,
  CalendarIcon,
  CheckCircle2,
  Info,
  FileText,
  Image as ImageIcon,
  Shield,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useWarehouseSections } from "@/hooks/use-warehouse-sections";
import { usePallets } from "@/hooks/use-pallets";
import { useCases } from "@/hooks/use-cases";
import { AddCaseModal } from "@/components/inventory/AddCaseModal";

const equipmentTypes = [
  "Computer",
  "Printer",
  "Monitor",
  "Projector",
  "Furniture",
  "AV Equipment",
  "Office Equipment",
  "Other",
];

const categories = [
  "Electronics",
  "Furniture",
  "Office Equipment",
  "AV Equipment",
  "Medical Equipment",
  "Supplies",
  "Education",
];

const conditions = ["Excellent", "Good", "Fair", "Poor"];
const statuses = ["Available", "Checked Out", "Maintenance", "Retired"];

const certifications = [
  "Equipment Safety",
  "Office Ergonomics",
  "AV Systems",
  "IT Security",
  "First Aid",
  "General Safety",
];

const mockStaff = [
  "Sarah Martinez",
  "James Wilson",
  "Maria Garcia",
  "Robert Chen",
  "Lisa Wong",
];

const AddEquipment = () => {
  const navigate = useNavigate();

  // Section 1: Equipment Information
  const [equipmentName, setEquipmentName] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [category, setCategory] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [yearManufactured, setYearManufactured] = useState("");
  const [description, setDescription] = useState("");

  // Section 2: Condition & Status
  const [condition, setCondition] = useState("");
  const [status, setStatus] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [expectedLifespan, setExpectedLifespan] = useState("");
  const [warrantyExpiration, setWarrantyExpiration] = useState<Date>();
  const [isConsumable, setIsConsumable] = useState(false);

  // Section 3: Location & Assignment
  const [placementType, setPlacementType] = useState<"section" | "pallet" | "case-pallet" | "case-standalone">("section");
  const [warehouse, setWarehouse] = useState("");
  const [section, setSection] = useState("");
  const [pallet, setPallet] = useState("");
  const [caseId, setCaseId] = useState("");
  const [positionOnPallet, setPositionOnPallet] = useState("");
  const [row, setRow] = useState("");
  const [shelf, setShelf] = useState("");
  const [bin, setBin] = useState("");
  const [custodian, setCustodian] = useState("");
  const [lastCheckIn, setLastCheckIn] = useState<Date>();
  const [calibrationRequired, setCalibrationRequired] = useState(false);
  const [calibrationFrequency, setCalibrationFrequency] = useState("");
  const [lastCalibration, setLastCalibration] = useState<Date>();
  const [addCaseModalOpen, setAddCaseModalOpen] = useState(false);

  // Load data
  const { warehouses: warehousesList, loading: warehousesLoading } = useWarehouses();
  const { sections: sectionsList, loading: sectionsLoading } = useWarehouseSections(warehouse || undefined);
  const { pallets: palletsList, loading: palletsLoading } = usePallets(section || undefined);
  const { cases: casesList, loading: casesLoading } = useCases(pallet || undefined, section || undefined);

  // Auto-select first location when loaded and none selected
  useEffect(() => {
    if (!warehouse && warehousesList.length > 0) {
      setWarehouse(warehousesList[0].id);
    }
  }, [warehousesList, warehouse]);

  // Section 4: Maintenance & Compliance
  const [maintenanceInterval, setMaintenanceInterval] = useState("");
  const [maintenanceUnit, setMaintenanceUnit] = useState("months");
  const [certificationRequired, setCertificationRequired] = useState(false);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);

  // Section 5: Attachments
  const [photos, setPhotos] = useState<File[]>([]);
  const [manuals, setManuals] = useState<File[]>([]);
  const [certificates, setCertificates] = useState<File[]>([]);

  // Review
  const [showReview, setShowReview] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos([...photos, ...Array.from(e.target.files)]);
    }
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setManuals([...manuals, ...Array.from(e.target.files)]);
    }
  };

  const handleCertificateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setCertificates([...certificates, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index: number, type: "photo" | "manual" | "certificate") => {
    if (type === "photo") {
      setPhotos(photos.filter((_, i) => i !== index));
    } else if (type === "manual") {
      setManuals(manuals.filter((_, i) => i !== index));
    } else {
      setCertificates(certificates.filter((_, i) => i !== index));
    }
  };

  const toggleCertification = (cert: string) => {
    setSelectedCertifications((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  };

  const calculateNextCalibration = () => {
    if (lastCalibration && calibrationFrequency) {
      const months = parseInt(calibrationFrequency);
      const nextDate = new Date(lastCalibration);
      nextDate.setMonth(nextDate.getMonth() + months);
      return format(nextDate, "PPP");
    }
    return "N/A";
  };

  const handleSave = () => {
    if (!equipmentName || !condition || !status) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in all required fields before saving.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Equipment Successfully Added",
      description: `${equipmentName} has been registered in the inventory system.`,
    });
    navigate("/inventory");
  };

  const handleCancel = () => {
    navigate("/inventory");
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB] dark:bg-background flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Inventory", href: "/inventory" },
              { label: "Add New Equipment" },
            ]}
          />
          <Button variant="outline" onClick={handleCancel} className="self-start sm:self-auto">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
        </div>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0D1321] dark:text-foreground">
            Add New Equipment
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Register new assets in your inventory system
          </p>
        </div>

        <div className="space-y-6">
          {/* Section 1: Equipment Information */}
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/30 text-sm font-bold">
                  1
                </span>
                Equipment Information
              </h2>
              <p className="text-sm text-muted-foreground mt-1 ml-10">
                Basic details about the equipment
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 ml-10">
              <div className="space-y-2">
                <Label htmlFor="equipment-name" className="flex items-center gap-1">
                  Equipment Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="equipment-name"
                  placeholder="e.g., MacBook Pro 16 inch"
                  value={equipmentName}
                  onChange={(e) => setEquipmentName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="asset-tag">Asset Tag / Serial Number</Label>
                <Input
                  id="asset-tag"
                  placeholder="Auto-generated if left blank"
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment-type">
                  Equipment Type
                </Label>
                <Select value={equipmentType} onValueChange={setEquipmentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  placeholder="e.g., Honda"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model-number">Model Number</Label>
                <Input
                  id="model-number"
                  placeholder="e.g., EU7000iS"
                  value={modelNumber}
                  onChange={(e) => setModelNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year-manufactured">Year of Manufacture</Label>
                <Input
                  id="year-manufactured"
                  type="number"
                  placeholder="e.g., 2023"
                  value={yearManufactured}
                  onChange={(e) => setYearManufactured(e.target.value)}
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Detailed description of the equipment, features, and specifications..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Section 2: Condition & Status */}
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/30 text-sm font-bold">
                  2
                </span>
                Condition & Status
              </h2>
              <p className="text-sm text-muted-foreground mt-1 ml-10">
                Current condition and availability status
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 ml-10">
              <div className="space-y-2">
                <Label htmlFor="condition" className="flex items-center gap-1">
                  Condition <span className="text-red-500">*</span>
                </Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {conditions.map((cond) => (
                      <SelectItem key={cond} value={cond}>
                        {cond}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="flex items-center gap-1">
                  Status <span className="text-red-500">*</span>
                </Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((stat) => (
                      <SelectItem key={stat} value={stat}>
                        {stat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lifespan">Expected Lifespan (years)</Label>
                <Input
                  id="lifespan"
                  type="number"
                  placeholder="e.g., 10"
                  value={expectedLifespan}
                  onChange={(e) => setExpectedLifespan(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Warranty Expiration</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !warrantyExpiration && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {warrantyExpiration ? format(warrantyExpiration, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={warrantyExpiration}
                      onSelect={setWarrantyExpiration}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <Switch
                  id="consumable"
                  checked={isConsumable}
                  onCheckedChange={setIsConsumable}
                />
                <div>
                  <Label htmlFor="consumable" className="cursor-pointer">
                    Mark as Consumable
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Item will be depleted with use
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Section 3: Location & Assignment */}
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/30 text-sm font-bold">
                  3
                </span>
                Location & Assignment
              </h2>
              <p className="text-sm text-muted-foreground mt-1 ml-10">
                Storage location and container assignment
              </p>
            </div>

            <div className="space-y-6 ml-10">
              {/* Placement Type Selection */}
              <div className="space-y-4">
                <Label>Where will this equipment be stored?</Label>
                <RadioGroup value={placementType} onValueChange={(value: any) => {
                  setPlacementType(value);
                  // Reset relevant fields when changing placement type
                  setPallet("");
                  setCaseId("");
                  setPositionOnPallet("");
                }}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="section" id="section-placement" />
                    <Label htmlFor="section-placement" className="cursor-pointer flex-1">
                      Place directly in section
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="pallet" id="pallet-placement" />
                    <Label htmlFor="pallet-placement" className="cursor-pointer flex-1">
                      Add to an existing pallet
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="case-pallet" id="case-pallet-placement" />
                    <Label htmlFor="case-pallet-placement" className="cursor-pointer flex-1">
                      Add to a case inside a pallet
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value="case-standalone" id="case-standalone-placement" />
                    <Label htmlFor="case-standalone-placement" className="cursor-pointer flex-1">
                      Add to a stand-alone case
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Dynamic Fields Based on Placement Type */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Location - Always shown */}
                <div className="space-y-2">
                  <Label htmlFor="warehouse">Location *</Label>
                  <Select value={warehouse} onValueChange={(value) => {
                    setWarehouse(value);
                    setSection("");
                    setPallet("");
                    setCaseId("");
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehousesList.map((wh) => (
                        <SelectItem key={wh.id} value={wh.id}>
                          {wh.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Section - Always shown */}
                <div className="space-y-2">
                  <Label htmlFor="section">Section *</Label>
                  <Select 
                    value={section} 
                    onValueChange={(value) => {
                      setSection(value);
                      setPallet("");
                      setCaseId("");
                    }}
                    disabled={!warehouse}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={warehouse ? "Select section" : "Select location first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {sectionsList.map((sec) => (
                        <SelectItem key={sec.id} value={sec.id}>
                          {sec.section_name} ({sec.section_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pallet - Show for pallet and case-pallet placements */}
                {(placementType === "pallet" || placementType === "case-pallet") && (
                  <div className="space-y-2">
                    <Label htmlFor="pallet">Pallet *</Label>
                    <Select 
                      value={pallet} 
                      onValueChange={(value) => {
                        setPallet(value);
                        if (placementType === "case-pallet") {
                          setCaseId("");
                        }
                      }}
                      disabled={!section}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={section ? "Select pallet" : "Select section first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {palletsList.map((pal) => (
                          <SelectItem key={pal.id} value={pal.id}>
                            {pal.pallet_id} - {pal.pallet_type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Case - Show for case-pallet placement */}
                {placementType === "case-pallet" && (
                  <div className="space-y-2">
                    <Label htmlFor="case">Case *</Label>
                    <Select value={caseId} onValueChange={setCaseId} disabled={!pallet}>
                      <SelectTrigger>
                        <SelectValue placeholder={pallet ? "Select case" : "Select pallet first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {casesList.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.case_id} - {c.case_type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Case - Show for case-standalone placement */}
                {placementType === "case-standalone" && (
                  <div className="space-y-2">
                    <Label htmlFor="case">Case *</Label>
                    <div className="flex gap-2">
                      <Select value={caseId} onValueChange={setCaseId} disabled={!section}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder={section ? "Select case" : "Select section first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {casesList.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.case_id} - {c.case_type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setAddCaseModalOpen(true)}
                        disabled={!section}
                      >
                        Create New Case
                      </Button>
                    </div>
                  </div>
                )}

                {/* Position on Pallet - Show for pallet placement */}
                {placementType === "pallet" && pallet && (
                  <div className="space-y-2">
                    <Label htmlFor="position">Position on Pallet (Optional)</Label>
                    <Input
                      id="position"
                      placeholder="e.g., Front-left, Row 2 Col 3"
                      value={positionOnPallet}
                      onChange={(e) => setPositionOnPallet(e.target.value)}
                    />
                  </div>
                )}

                {/* Row/Shelf/Bin - Show for section-only placement */}
                {placementType === "section" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="row">Row (Optional)</Label>
                      <Input
                        id="row"
                        placeholder="e.g., A, 1"
                        value={row}
                        onChange={(e) => setRow(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shelf">Shelf (Optional)</Label>
                      <Input
                        id="shelf"
                        placeholder="e.g., 2, B"
                        value={shelf}
                        onChange={(e) => setShelf(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bin">Bin (Optional)</Label>
                      <Input
                        id="bin"
                        placeholder="e.g., 15, C-3"
                        value={bin}
                        onChange={(e) => setBin(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Custodian - Always shown */}
                <div className="space-y-2">
                  <Label htmlFor="custodian">Custodian</Label>
                  <Select value={custodian} onValueChange={setCustodian}>
                    <SelectTrigger>
                      <SelectValue placeholder="Assign custodian" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockStaff.map((staff) => (
                        <SelectItem key={staff} value={staff}>
                          {staff}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Last Check-In - Always shown */}
                <div className="space-y-2">
                  <Label>Last Check-In</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !lastCheckIn && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {lastCheckIn ? format(lastCheckIn, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={lastCheckIn}
                        onSelect={setLastCheckIn}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Calibration */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <Switch
                    id="calibration"
                    checked={calibrationRequired}
                    onCheckedChange={setCalibrationRequired}
                  />
                  <div className="flex-1">
                    <Label htmlFor="calibration" className="cursor-pointer">
                      Calibration Required
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Equipment requires periodic calibration
                    </p>
                  </div>
                </div>

                {calibrationRequired && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4 p-4 bg-blue-50 dark:bg-blue-950/10 rounded-lg border border-blue-200 dark:border-blue-900">
                    <div className="space-y-2">
                      <Label htmlFor="calibration-frequency">
                        Calibration Frequency (months)
                      </Label>
                      <Input
                        id="calibration-frequency"
                        type="number"
                        placeholder="e.g., 6"
                        value={calibrationFrequency}
                        onChange={(e) => setCalibrationFrequency(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Last Calibration Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !lastCalibration && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {lastCalibration ? format(lastCalibration, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={lastCalibration}
                            onSelect={setLastCalibration}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Next Due Date</Label>
                      <div className="p-2 bg-background border rounded-md text-sm">
                        {calculateNextCalibration()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Add Case Modal */}
          {section && placementType === "case-standalone" && (
            <AddCaseModal
              open={addCaseModalOpen}
              onClose={() => setAddCaseModalOpen(false)}
              sectionId={section}
              palletId=""
              palletName=""
              onCaseAdded={() => {
                setAddCaseModalOpen(false);
                toast({
                  title: "Case created",
                  description: "New case has been created successfully.",
                });
              }}
            />
          )}

          {/* Section 4: Maintenance & Compliance */}
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/30 text-sm font-bold">
                  4
                </span>
                Maintenance & Compliance
              </h2>
              <p className="text-sm text-muted-foreground mt-1 ml-10">
                Maintenance schedules and certification requirements
              </p>
            </div>

            <div className="space-y-6 ml-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maintenance-interval">Maintenance Interval</Label>
                  <div className="flex gap-2">
                    <Input
                      id="maintenance-interval"
                      type="number"
                      placeholder="e.g., 6"
                      value={maintenanceInterval}
                      onChange={(e) => setMaintenanceInterval(e.target.value)}
                      className="flex-1"
                    />
                    <Select value={maintenanceUnit} onValueChange={setMaintenanceUnit}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="years">Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <Switch
                    id="certification-required"
                    checked={certificationRequired}
                    onCheckedChange={setCertificationRequired}
                  />
                  <div className="flex-1">
                    <Label htmlFor="certification-required" className="cursor-pointer flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Certification Required
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Operator must have specific certifications
                    </p>
                  </div>
                </div>

                {certificationRequired && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/10 rounded-lg border border-blue-200 dark:border-blue-900">
                    <Label className="mb-3 block">Required Certifications</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {certifications.map((cert) => (
                        <div key={cert} className="flex items-center space-x-2">
                          <Checkbox
                            id={cert}
                            checked={selectedCertifications.includes(cert)}
                            onCheckedChange={() => toggleCertification(cert)}
                          />
                          <label htmlFor={cert} className="text-sm cursor-pointer">
                            {cert}
                          </label>
                        </div>
                      ))}
                    </div>
                    {selectedCertifications.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedCertifications.map((cert) => (
                          <Badge key={cert} variant="secondary">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Section 5: Attachments */}
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/30 text-sm font-bold">
                  5
                </span>
                Attachments
              </h2>
              <p className="text-sm text-muted-foreground mt-1 ml-10">
                Upload photos, manuals, and certificates
              </p>
            </div>

            <div className="space-y-6 ml-10">
              {/* Photos */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Equipment Photos
                </Label>
                <div className="border rounded-lg p-6 bg-muted/30 text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, WEBP (max 5MB each)
                    </p>
                  </label>
                </div>
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {photos.map((file, index) => (
                      <div
                        key={index}
                        className="relative p-3 border rounded-lg bg-muted/30 group"
                      >
                        <ImageIcon className="h-8 w-8 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs truncate text-center">{file.name}</p>
                        <button
                          onClick={() => removeFile(index, "photo")}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Manuals */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Manuals / PDFs
                </Label>
                <div className="border rounded-lg p-6 bg-muted/30 text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    multiple
                    onChange={handleManualUpload}
                    className="hidden"
                    id="manual-upload"
                  />
                  <label htmlFor="manual-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX (max 10MB each)</p>
                  </label>
                </div>
                {manuals.length > 0 && (
                  <div className="space-y-2">
                    {manuals.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 group"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm truncate">{file.name}</span>
                        </div>
                        <button
                          onClick={() => removeFile(index, "manual")}
                          className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Certificates */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Certificates
                </Label>
                <div className="border rounded-lg p-6 bg-muted/30 text-center hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    onChange={handleCertificateUpload}
                    className="hidden"
                    id="certificate-upload"
                  />
                  <label htmlFor="certificate-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, JPG, PNG (max 5MB each)
                    </p>
                  </label>
                </div>
                {certificates.length > 0 && (
                  <div className="space-y-2">
                    {certificates.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 group"
                      >
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm truncate">{file.name}</span>
                        </div>
                        <button
                          onClick={() => removeFile(index, "certificate")}
                          className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Section 6: Review & Save */}
          {equipmentName && equipmentType && condition && status && (
            <Card className="p-6 bg-blue-50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">
                    <Info className="h-4 w-4" />
                  </span>
                  Review Summary
                </h2>
                <p className="text-sm text-muted-foreground mt-1 ml-10">
                  Preview key details before saving
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-10">
                <div>
                  <Label className="text-xs text-muted-foreground">Equipment Name</Label>
                  <p className="font-semibold text-foreground">{equipmentName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <p className="font-semibold text-foreground">{equipmentType}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Condition</Label>
                  <Badge
                    className={
                      condition === "Excellent"
                        ? "bg-green-100 text-green-700 dark:bg-green-950/20"
                        : condition === "Good"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950/20"
                        : condition === "Fair"
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-950/20"
                        : "bg-red-100 text-red-700 dark:bg-red-950/20"
                    }
                  >
                    {condition}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge variant="outline">{status}</Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Location</Label>
                  <p className="font-semibold text-foreground">{warehouse || "Not assigned"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Custodian</Label>
                  <p className="font-semibold text-foreground">{custodian || "Not assigned"}</p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sticky Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">
                  Fill required fields to save equipment
                </span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Save Equipment
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <LegalFooter />
    </div>
  );
};

export default AddEquipment;
