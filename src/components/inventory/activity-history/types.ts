import { CheckoutHistoryRecord } from "@/hooks/use-item-checkout-history";

export type ActivityStatus = 'active' | 'returned' | 'overdue';

export interface ActivityStatusInfo {
  status: ActivityStatus;
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
}

export interface EditableFields {
  checkin_notes: string | null;
  return_condition: string | null;
  expected_return_at: string | null;
  checkout_notes: string | null;
}

export interface ActivityHistoryFilters {
  actionType: 'all' | 'checked_out' | 'returned';
  employeeId: string | null;
  status: 'all' | 'active' | 'returned' | 'overdue';
  sortOrder: 'newest' | 'oldest';
}

export const getActivityStatus = (record: CheckoutHistoryRecord): ActivityStatusInfo => {
  if (record.checked_in_at) {
    return {
      status: 'returned',
      label: 'Returned',
      variant: 'secondary',
    };
  }

  if (record.expected_return_at && new Date(record.expected_return_at) < new Date()) {
    return {
      status: 'overdue',
      label: 'Overdue',
      variant: 'destructive',
    };
  }

  return {
    status: 'active',
    label: 'Checked Out',
    variant: 'warning',
  };
};

// Fields that can be edited (non-immutable)
export const EDITABLE_FIELDS = ['checkin_notes', 'return_condition', 'expected_return_at', 'checkout_notes'] as const;

// Fields that are immutable for audit integrity
export const IMMUTABLE_FIELDS = [
  'employee_id',
  'checked_out_at',
  'checked_in_at',
  'checked_out_quantity',
  'checked_out_by',
  'checked_in_by',
  'item_id',
] as const;
