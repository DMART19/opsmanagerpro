/**
 * DemoDataContext — Ephemeral in-memory store for demo sessions.
 *
 * The real app pages (Inventory, People, Calendar, Dashboard) read/write
 * through their existing data hooks (use-inventory-data, use-employees-data,
 * use-calendar-items, use-requirements-data, use-unified-stats, use-boxes).
 * Those hooks already branch on `isDemo` from DemoContext and call the
 * methods exposed here. No DB writes occur.
 */
import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import { buildSeed } from "@/lib/demo-seed";

// ── Loose types (shape must match what hooks/components read) ──────────
export type DemoAsset = ReturnType<typeof buildSeed>["assets"][number];
export type DemoEmployee = ReturnType<typeof buildSeed>["employees"][number];
export type DemoTask = ReturnType<typeof buildSeed>["tasks"][number];
export type DemoRequirement = ReturnType<typeof buildSeed>["requirements"][number];
export type DemoEmployeeRequirement = ReturnType<typeof buildSeed>["employeeRequirements"][number];
export type DemoContainer = ReturnType<typeof buildSeed>["containers"][number];
export type DemoCheckout = Record<string, any> & { id: string };
export type DemoPallet = Record<string, any> & { id: string };

interface DemoDataContextValue {
  assets: DemoAsset[];
  employees: DemoEmployee[];
  tasks: DemoTask[];
  requirements: DemoRequirement[];
  employeeRequirements: DemoEmployeeRequirement[];
  containers: DemoContainer[];

  addAsset: (a: Partial<DemoAsset>) => DemoAsset;
  updateAsset: (id: string, updates: Partial<DemoAsset>) => void;
  deleteAsset: (id: string) => void;

  addEmployee: (e: Partial<DemoEmployee>) => DemoEmployee;
  updateEmployee: (id: string, updates: Partial<DemoEmployee>) => void;
  deleteEmployee: (id: string) => void;

  addTask: (t: Partial<DemoTask>) => DemoTask;
  updateTask: (id: string, updates: Partial<DemoTask>) => void;
  deleteTask: (id: string) => void;

  reset: () => void;
}

const DemoDataContext = createContext<DemoDataContextValue | null>(null);

const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const DemoDataProvider = ({ children }: { children: ReactNode }) => {
  const initial = useMemo(() => buildSeed(), []);
  const [assets, setAssets] = useState<DemoAsset[]>(initial.assets);
  const [employees, setEmployees] = useState<DemoEmployee[]>(initial.employees);
  const [tasks, setTasks] = useState<DemoTask[]>(initial.tasks);
  const [requirements, setRequirements] = useState<DemoRequirement[]>(initial.requirements);
  const [employeeRequirements, setEmployeeRequirements] = useState<DemoEmployeeRequirement[]>(
    initial.employeeRequirements,
  );
  const [containers, setContainers] = useState<DemoContainer[]>(initial.containers);

  const nowIso = () => new Date().toISOString();

  const addAsset = useCallback((a: Partial<DemoAsset>): DemoAsset => {
    const newAsset: DemoAsset = {
      id: newId("demo-asset"),
      description: null,
      subcategory: null,
      section: null,
      quantity_available: 1,
      quantity_out: 0,
      status_item: "Available",
      date_expire: null,
      id_cache_fema: null,
      id_cache_tf: null,
      barcode: null,
      serial_number: null,
      manufacturer: null,
      model_part_num: null,
      group_abbv: null,
      group_year: null,
      is_internal: false,
      image_url: null,
      low_stock_threshold: null,
      critical_stock_threshold: null,
      container_id: null,
      user_id: null,
      created_at: nowIso(),
      updated_at: nowIso(),
      ...(a as any),
    } as DemoAsset;
    setAssets((prev) => [newAsset, ...prev]);
    return newAsset;
  }, []);

  const updateAsset = useCallback((id: string, updates: Partial<DemoAsset>) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates, updated_at: nowIso() } : a)),
    );
  }, []);

  const deleteAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addEmployee = useCallback((e: Partial<DemoEmployee>): DemoEmployee => {
    const newEmp: DemoEmployee = {
      id: newId("demo-emp"),
      first_name: "New",
      last_name: "Member",
      email: null,
      phone: null,
      position: null,
      department: null,
      department_id: null,
      status: "Active",
      employee_status_id: null,
      hire_date: null,
      avatar_url: null,
      base_location: null,
      employee_id: null,
      fema_id: null,
      notes: null,
      tags: null,
      role_id: null,
      user_id: null,
      created_at: nowIso(),
      updated_at: nowIso(),
      requirements_stats: { compliant: 0, expiring_soon: 0, missing_expired: 0, total: 0 },
      employee_requirements: [],
      team_role: null,
      ...(e as any),
    } as DemoEmployee;
    setEmployees((prev) => [newEmp, ...prev]);
    return newEmp;
  }, []);

  const updateEmployee = useCallback((id: string, updates: Partial<DemoEmployee>) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, ...updates, updated_at: nowIso() } : emp)),
    );
  }, []);

  const deleteEmployee = useCallback((id: string) => {
    setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    setEmployeeRequirements((prev) => prev.filter((er) => er.employee_id !== id));
  }, []);

  const addTask = useCallback((t: Partial<DemoTask>): DemoTask => {
    const newTask: DemoTask = {
      id: newId("demo-task"),
      title: "New Event",
      description: null,
      task_type: "task",
      priority: "medium",
      status: "pending",
      start_date: new Date().toISOString().slice(0, 10),
      end_date: null,
      start_time: "09:00",
      end_time: "10:00",
      assigned_employees: [],
      location: null,
      reminder_enabled: false,
      user_id: null,
      created_at: nowIso(),
      updated_at: nowIso(),
      ...(t as any),
    } as DemoTask;
    setTasks((prev) => [newTask, ...prev]);
    return newTask;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<DemoTask>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates, updated_at: nowIso() } : t)),
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const reset = useCallback(() => {
    const seed = buildSeed();
    setAssets(seed.assets);
    setEmployees(seed.employees);
    setTasks(seed.tasks);
    setRequirements(seed.requirements);
    setEmployeeRequirements(seed.employeeRequirements);
    setContainers(seed.containers);
  }, []);

  const value: DemoDataContextValue = {
    assets,
    employees,
    tasks,
    requirements,
    employeeRequirements,
    containers,
    addAsset,
    updateAsset,
    deleteAsset,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addTask,
    updateTask,
    deleteTask,
    reset,
  };

  return <DemoDataContext.Provider value={value}>{children}</DemoDataContext.Provider>;
};

export const useDemoData = (): DemoDataContextValue => {
  const ctx = useContext(DemoDataContext);
  if (!ctx) throw new Error("useDemoData must be used within DemoDataProvider");
  return ctx;
};

/** Returns null when outside provider — safe for hooks that may render outside demo. */
export const useDemoDataOptional = (): DemoDataContextValue | null => {
  return useContext(DemoDataContext);
};