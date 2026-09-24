import { z } from 'zod';

// Equipment validation schemas
export const equipmentSchema = z.object({
  assetTag: z.string().trim().min(1, "Asset tag is required").max(50, "Asset tag must be less than 50 characters"),
  name: z.string().trim().min(1, "Equipment name is required").max(200, "Name must be less than 200 characters"),
  serialNumber: z.string().trim().max(100, "Serial number must be less than 100 characters").optional(),
  category: z.string().trim().max(100).optional(),
  manufacturer: z.string().trim().max(100).optional(),
  model: z.string().trim().max(100).optional(),
  warehouse: z.string().trim().max(100).optional(),
  location: z.string().trim().max(200).optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor', 'needs_repair']).optional(),
  status: z.enum(['available', 'checked_out', 'maintenance', 'retired']).optional(),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional(),
});

// Check in/out validation
export const checkOutSchema = z.object({
  equipmentId: z.string().uuid("Invalid equipment ID"),
  custodian: z.string().trim().min(1, "Custodian is required").max(100),
  purpose: z.string().trim().max(500, "Purpose must be less than 500 characters").optional(),
  dueDate: z.string().optional(),
  location: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const checkInSchema = z.object({
  equipmentId: z.string().uuid("Invalid equipment ID"),
  condition: z.enum(['excellent', 'good', 'fair', 'poor', 'needs_repair'], {
    required_error: "Condition is required"
  }),
  location: z.string().trim().min(1, "Return location is required").max(200),
  notes: z.string().trim().max(1000).optional(),
});

// Employee/Staff validation schemas
export const employeeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phone: z.string().trim().regex(/^[\d\s\-\+\(\)]+$/, "Invalid phone number format").max(20, "Phone must be less than 20 characters").optional(),
  role: z.enum(['admin', 'manager', 'technician', 'staff', 'viewer'], {
    required_error: "Role is required"
  }),
  department: z.string().trim().max(100).optional(),
  position: z.string().trim().max(100).optional(),
});

// Certification validation
export const certificationSchema = z.object({
  name: z.string().trim().min(1, "Certification name is required").max(200),
  issuedBy: z.string().trim().max(200).optional(),
  issueDate: z.date().optional(),
  expiryDate: z.date().optional(),
  status: z.enum(['valid', 'expired', 'pending']).optional(),
});

// Password validation
export const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(12, "Password must be at least 12 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Profile update validation
export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().trim().regex(/^[\d\s\-\+\(\)]+$/, "Invalid phone number format").max(20).optional(),
});

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(2000).optional(),
  type: z.string().trim().min(1, "Task type is required"),
  priority: z.string().trim().min(1, "Priority is required"),
  assignedTo: z.string().trim().max(100).optional(),
  dueDate: z.date().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
});

// Warehouse validation
export const warehouseSchema = z.object({
  name: z.string().trim().min(1, "Warehouse name is required").max(200),
  location: z.string().trim().max(500).optional(),
  capacity: z.number().int().positive("Capacity must be a positive number").optional(),
  manager: z.string().trim().max(100).optional(),
});

// Maintenance record validation
export const maintenanceSchema = z.object({
  equipmentId: z.string().uuid("Invalid equipment ID"),
  type: z.enum(['preventive', 'corrective', 'inspection', 'calibration']),
  description: z.string().trim().min(1, "Description is required").max(2000),
  performedBy: z.string().trim().max(100).optional(),
  cost: z.number().nonnegative("Cost must be non-negative").optional(),
  nextScheduled: z.string().optional(),
  notes: z.string().trim().max(1000).optional(),
});

// Shipment item validation
export const shipmentItemSchema = z.object({
  item_name: z.string().trim().min(1, "Item name is required").max(200, "Item name too long"),
  quantity: z.number().min(1, "Quantity must be at least 1").max(10000, "Quantity too large"),
  unit_weight: z.number().min(0.01, "Weight must be positive").max(100000, "Weight too large"),
  dimensions_length: z.number().min(0.1, "Length must be positive").max(1000, "Length too large"),
  dimensions_width: z.number().min(0.1, "Width must be positive").max(1000, "Width too large"),
  dimensions_height: z.number().min(0.1, "Height must be positive").max(1000, "Height too large"),
  condition: z.enum(["Excellent", "Good", "Fair", "Poor"]),
  notes: z.string().max(1000, "Notes too long").optional(),
  pallet_id: z.string().min(1, "Pallet ID required"),
  case_id: z.string().min(1, "Case ID required"),
});
