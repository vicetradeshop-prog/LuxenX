/**
 * Journal d'audit : toutes les opérations administratives importantes.
 * Les journaux ne contiennent ni mots de passe ni jetons (expurgés côté
 * serveur à la construction des entrées).
 */
import { useCallback, useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import type { AuditEntry } from "@luxenx/shared";
import { LxBadge, LxButton, LxPanel, LxSectionHeader, LxSpinner, LxEmptyState, EmptyBoxIllustration } from "@luxenx/ui";
import { api } from "../lib/api.js";

const PAGE_SIZE = 20;

export function AuditPage() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminAudit({ page, pageSize: PAGE_SIZE });
      setItems(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="lx-page">
      <LxSectionHeader title="Journal d'audit" subtitle={`${total} opération(s) administrative(s) enregistrée(s).`} />

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 50 }}>
          <LxSpinner />
        </div>
      )}

      {!loading && items.length === 0 && (
        <LxEmptyState
          illustration={<EmptyBoxIllustration />}
          title="Journal vide"
          description="Les opérations sensibles (comptes, cartes, tendances, versions) apparaîtront ici."
        />
      )}

      {!loading && items.length > 0 && (
        <LxPanel depth="flat" style={{ padding: "8px 12px", overflowX: "auto" }}>
          <table className="lx-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Acteur</th>
                <th>Action</th>
                <th>Cible</th>
                <th>Détails</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td className="lx-small">{new Date(a.at).toLocaleString("fr-FR")}</td>
                  <td className="lx-small">{a.actorEmail}</td>
                  <td><LxBadge tone="violet"><ScrollText size={10} /> {a.action}</LxBadge></td>
                  <td className="lx-small" style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>{a.target ?? "—"}</td>
                  <td className="lx-small" style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>{a.details ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="lx-pagination">
            <LxButton variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Précédent</LxButton>
            <span className="lx-small lx-muted">Page {page} / {pages}</span>
            <LxButton variant="ghost" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Suivant →</LxButton>
          </div>
        </LxPanel>
      )}
    </div>
  );
}
