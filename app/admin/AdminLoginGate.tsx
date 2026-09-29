"use client";

import { AdminLoginForm } from "./AdminShell";

export default function AdminLoginGate() {
  return <AdminLoginForm onSuccess={() => (window.location.href = "/admin/clients")} />;
}
