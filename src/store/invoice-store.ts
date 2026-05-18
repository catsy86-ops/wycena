import { create } from "zustand";
import { db } from "@/lib/db";
import type { Invoice, InvoiceStatus, Payment } from "@/types";
import { generateSequentialInvoiceNumber } from "@/lib/calculations";
import { isToday, isThisWeek, isThisMonth, isPast } from "date-fns";

interface InvoiceState {
  invoices: Invoice[];
  payments: Payment[];
  loading: boolean;
  search: string;
  statusFilter: InvoiceStatus | "all";
  dateFilter: "all" | "today" | "week" | "month";
  selectedInvoices: Set<number>;
  setSearch: (s: string) => void;
  setStatusFilter: (s: InvoiceStatus | "all") => void;
  setDateFilter: (f: "all" | "today" | "week" | "month") => void;
  toggleInvoiceSelection: (id: number) => void;
  clearSelection: () => void;
  selectAll: (ids: number[]) => void;
  load: () => Promise<void>;
  loadPayments: () => Promise<void>;
  add: (invoiceData: Omit<Invoice, "id" | "number" | "createdAt" | "updatedAt">) => Promise<number>;
  update: (id: number, invoiceData: Partial<Invoice>) => Promise<void>;
  remove: (id: number) => Promise<void>;
  bulkDelete: (ids: number[]) => Promise<void>;
  bulkChangeStatus: (ids: number[], status: InvoiceStatus) => Promise<void>;
  bulkDuplicate: (ids: number[]) => Promise<void>;
  changeStatus: (id: number, status: InvoiceStatus) => Promise<void>;
  addPayment: (paymentData: Omit<Payment, "id" | "createdAt">) => Promise<number>;
  getPaymentsForInvoice: (invoiceId: number) => Payment[];
  getTotalPaidForInvoice: (invoiceId: number) => number;
  getById: (id: number) => Invoice | undefined;
  getTotalStats: () => { total: number; paid: number; pending: number; overdue: number };
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  invoices: [],
  payments: [],
  loading: false,
  search: "",
  statusFilter: "all",
  dateFilter: "all",
  selectedInvoices: new Set(),
  setSearch: (s) => set({ search: s }),
  setStatusFilter: (s) => set({ statusFilter: s }),
  setDateFilter: (f) => set({ dateFilter: f }),
  toggleInvoiceSelection: (id) => {
    const selected = new Set(get().selectedInvoices);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    set({ selectedInvoices: selected });
  },
  clearSelection: () => set({ selectedInvoices: new Set() }),
  selectAll: (ids) => set({ selectedInvoices: new Set(ids) }),
  load: async () => {
    set({ loading: true });
    const invoices = await db.invoices.orderBy("issueDate").reverse().toArray();
    set({ invoices, loading: false });
  },
  loadPayments: async () => {
    const payments = await db.payments.orderBy("date").reverse().toArray();
    set({ payments });
  },
  add: async (invoiceData): Promise<number> => {
    const now = new Date();
    const existingNumbers = get().invoices.map((i) => i.number);
    const number = generateSequentialInvoiceNumber(existingNumbers);
    const invoice: Invoice = {
      ...invoiceData,
      number,
      createdAt: now,
      updatedAt: now,
    };
    const id = await db.invoices.add(invoice);
    await get().load();
    return id!;
  },
  update: async (id, invoiceData) => {
    const existing = await db.invoices.get(id);
    if (!existing) return;
    const updated = { ...existing, ...invoiceData, updatedAt: new Date() };
    await db.invoices.update(id, updated);
    await get().load();
  },
  remove: async (id) => {
    await db.invoices.delete(id);
    await get().load();
  },
  bulkDelete: async (ids) => {
    await db.invoices.bulkDelete(ids);
    await get().load();
  },
  bulkChangeStatus: async (ids, status) => {
    const now = new Date();
    await Promise.all(ids.map((id) => db.invoices.update(id, { status, updatedAt: now })));
    await get().load();
  },
  bulkDuplicate: async (ids) => {
    const invoices = ids.map((id) => get().getById(id)).filter(Boolean) as Invoice[];
    const now = new Date();
    const existingNumbers = get().invoices.map((i) => i.number);
    let counter = 0;
    
    const newInvoices = invoices.map((inv) => {
      const number = generateSequentialInvoiceNumber([...existingNumbers, ...newInvoices.slice(0, counter).map((i) => i.number)]);
      counter++;
      return {
        ...inv,
        id: undefined,
        number,
        status: "niezaplacona" as InvoiceStatus,
        issueDate: now,
        dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        createdAt: now,
        updatedAt: now,
      };
    });
    
    await db.invoices.bulkAdd(newInvoices);
    await get().load();
  },
  changeStatus: async (id, status) => {
    await db.invoices.update(id, { status, updatedAt: new Date() });
    await get().load();
  },
  addPayment: async (paymentData): Promise<number> => {
    const now = new Date();
    const payment: Payment = { ...paymentData, createdAt: now };
    const id = await db.payments.add(payment);
    await get().loadPayments();
    return id!;
  },
  getPaymentsForInvoice: (invoiceId) => get().payments.filter((p) => p.invoiceId === invoiceId),
  getTotalPaidForInvoice: (invoiceId) => {
    return get().payments
      .filter((p) => p.invoiceId === invoiceId)
      .reduce((sum, p) => sum + p.amount, 0);
  },
  getById: (id) => get().invoices.find((i) => i.id === id),
  getTotalStats: () => {
    const invoices = get().invoices;
    const payments = get().payments;
    
    let total = 0;
    let paid = 0;
    let pending = 0;
    let overdue = 0;
    
    invoices.forEach((inv) => {
      total += inv.totalBrutto;
      const totalPaid = payments.filter((p) => p.invoiceId === inv.id).reduce((sum, p) => sum + p.amount, 0);
      
      if (inv.status === "zaplacona") {
        paid += inv.totalBrutto;
      } else if (inv.status === "czesciowo") {
        paid += totalPaid;
        pending += inv.totalBrutto - totalPaid;
      } else if (inv.status === "niezaplacona") {
        pending += inv.totalBrutto;
        if (isPast(new Date(inv.dueDate))) {
          overdue += inv.totalBrutto;
        }
      }
    });
    
    return { total, paid, pending, overdue };
  },
}));
