import { create } from "zustand";
import { db } from "@/lib/db";
import type { Invoice, InvoiceStatus, Payment } from "@/types";
import { generateInvoiceNumber } from "@/lib/calculations";

interface InvoiceState {
  invoices: Invoice[];
  payments: Payment[];
  loading: boolean;
  search: string;
  statusFilter: InvoiceStatus | "all";
  setSearch: (s: string) => void;
  setStatusFilter: (s: InvoiceStatus | "all") => void;
  load: () => Promise<void>;
  loadPayments: () => Promise<void>;
  add: (invoice: Omit<Invoice, "id" | "number" | "createdAt" | "updatedAt">) => Promise<number>;
  update: (id: number, invoice: Partial<Invoice>) => Promise<void>;
  remove: (id: number) => Promise<void>;
  changeStatus: (id: number, status: InvoiceStatus) => Promise<void>;
  addPayment: (payment: Omit<Payment, "id" | "createdAt">) => Promise<number>;
  getPaymentsForInvoice: (invoiceId: number) => Payment[];
  getTotalPaidForInvoice: (invoiceId: number) => number;
  getById: (id: number) => Invoice | undefined;
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  invoices: [],
  payments: [],
  loading: false,
  search: "",
  statusFilter: "all",
  setSearch: (s) => set({ search: s }),
  setStatusFilter: (s) => set({ statusFilter: s }),
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
    const number = generateInvoiceNumber();
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
}));
