const fcfa = (n) =>
  String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
const dfr = (d) => (d || "").split("-").reverse().join("/");
const ent = (p) => p?.ent || "Compta facile";

export const norm = (s) => (s || "").trim().toLowerCase();

// Ouvre WhatsApp avec un message prêt. Sans numéro, WhatsApp laisse choisir le contact.
export function wa(tel, msg) {
  let n = (tel || "").replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (n.length === 9) n = "221" + n; // numéro sénégalais sans indicatif
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(msg)}`, "_blank");
}

export function msgFacture(t, p) {
  const reste = t.amount - (t.paid ?? t.amount);
  return (
    `Bonjour${t.tiers ? " " + t.tiers : ""}, voici votre facture ${t.invoiceNo || ""} du ${dfr(t.date)} d'un montant de ${fcfa(t.amount)}.` +
    (reste > 0 ? ` Reste à payer : ${fcfa(reste)}.` : " Merci pour votre paiement !") +
    `\n${ent(p)}`
  );
}

export function msgRelance(t, p) {
  const reste = t.amount - (t.paid ?? t.amount);
  return `Bonjour${t.tiers ? " " + t.tiers : ""}, j'espère que vous allez bien. Petit rappel : il reste ${fcfa(reste)} à régler sur la facture ${t.invoiceNo || ""} du ${dfr(t.date)}. Merci d'avance !\n${ent(p)}`;
}

export function msgRelanceClient(nom, reste, p) {
  return `Bonjour ${nom}, j'espère que vous allez bien. Petit rappel : il vous reste ${fcfa(reste)} à régler. Merci d'avance !\n${ent(p)}`;
}

export function msgCommande(c, p) {
  return c.statut === "livree"
    ? `Bonjour ${c.client}, votre commande (${c.produit}) a bien été livrée. Merci de votre confiance !\n${ent(p)}`
    : `Bonjour ${c.client}, votre commande (${c.produit}) sera livrée${c.dateLivraison ? " le " + dfr(c.dateLivraison) : " bientôt"}. Merci de votre confiance !\n${ent(p)}`;
}
