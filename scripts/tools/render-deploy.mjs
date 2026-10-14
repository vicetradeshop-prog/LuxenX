/**
 * Déclenche un déploiement Render via l'API officielle.
 * Usage : node render-deploy.mjs <RENDER_API_KEY> <RENDER_SERVICE_ID>
 * Suit l'état du déploiement pendant quelques minutes.
 */
const [, , apiKey, serviceId] = process.argv;

if (!apiKey || !serviceId) {
  console.error("Usage : render-deploy.mjs <RENDER_API_KEY> <RENDER_SERVICE_ID>");
  process.exit(2);
}

const API = "https://api.render.com/v1";
const headers = { Authorization: `Bearer ${apiKey}`, Accept: "application/json" };

async function main() {
  console.log("  Création du déploiement Render…");
  const res = await fetch(`${API}/services/${serviceId}/deploys`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ clearCache: "do_not_clear" }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Render a répondu ${res.status} : ${body.slice(0, 200)}`);
  }
  const deploy = await res.json();
  const id = deploy?.id ?? deploy?.deploy?.id;
  if (!id) throw new Error("Réponse Render inattendue (pas d'identifiant de déploiement).");
  console.log(`  Déploiement ${id} créé. Suivi de l'état…`);

  const startedAt = Date.now();
  while (Date.now() - startedAt < 10 * 60 * 1000) {
    await new Promise((r) => setTimeout(r, 15000));
    const st = await fetch(`${API}/services/${serviceId}/deploys/${id}`, { headers });
    if (!st.ok) continue;
    const info = await st.json();
    const status = info?.status ?? info?.deploy?.status ?? "inconnu";
    console.log(`  … état : ${status}`);
    if (status === "live") {
      console.log("  Déploiement RÉUSSI : le backend est en ligne.");
      process.exit(0);
    }
    if (["build_failed", "update_failed", "canceled", "failed"].includes(status)) {
      throw new Error(`Déploiement en échec (${status}). Consultez le journal Render.`);
    }
  }
  throw new Error("Délai de suivi dépassé : vérifiez le tableau de bord Render.");
}

main().catch((err) => {
  console.error(`  [ERREUR] ${err.message}`);
  process.exit(1);
});
