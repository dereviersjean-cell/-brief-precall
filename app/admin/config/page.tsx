import ConfigAdminClient from "./ConfigAdminClient";

// Réglages de génération du brief — outil technique, déplacé de /admin le
// 29/09/2026 : l'admin s'ouvre désormais sur le suivi des clients. Le
// composant gère lui-même la connexion (il affiche le formulaire si
// /api/admin/config répond 401).
export default function ConfigAdminPage() {
  return <ConfigAdminClient />;
}
