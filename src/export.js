import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const fcfa = (n) =>
  String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";

function filtrer(transactions, mois) {
  return transactions.filter((t) => t.date?.startsWith(mois));
}

function totaux(liste) {
  const recettes = liste
    .filter((t) => t.type === "recette")
    .reduce((s, t) => s + Number(t.paid ?? t.amount), 0);
  const depenses = liste
    .filter((t) => t.type === "depense")
    .reduce((s, t) => s + Number(t.amount), 0);
  return { recettes, depenses, solde: recettes - depenses };
}

export function exportPDF(transactions, mois, entreprise = "Compta facile") {
  const liste = filtrer(transactions, mois);
  const t = totaux(liste);
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(`Bilan mensuel - ${mois}`, 14, 18);
  doc.setFontSize(11);
  doc.text(entreprise, 14, 26);

  autoTable(doc, {
    startY: 32,
    head: [["Recettes", "Dépenses", "Solde"]],
    body: [[fcfa(t.recettes), fcfa(t.depenses), fcfa(t.solde)]],
    headStyles: { fillColor: [15, 23, 42] },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [["Date", "Type", "Catégorie", "Description", "Montant"]],
    body: liste.map((x) => [
      x.date,
      x.type === "recette" ? "Recette" : "Dépense",
      x.category || "",
      x.label || "",
      fcfa(x.amount),
    ]),
    headStyles: { fillColor: [16, 185, 129] },
  });

  doc.save(`bilan-${mois}.pdf`);
}

export function exportExcel(transactions, mois) {
  const liste = filtrer(transactions, mois);
  const t = totaux(liste);

  const lignes = liste.map((x) => ({
    Date: x.date,
    Type: x.type === "recette" ? "Recette" : "Dépense",
    Catégorie: x.category || "",
    Description: x.label || "",
    "Montant (FCFA)": Number(x.amount),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lignes), "Journal");
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      { Libellé: "Recettes", "Montant (FCFA)": t.recettes },
      { Libellé: "Dépenses", "Montant (FCFA)": t.depenses },
      { Libellé: "Solde", "Montant (FCFA)": t.solde },
    ]),
    "Bilan"
  );
  XLSX.writeFile(wb, `bilan-${mois}.xlsx`);
}

export function exportFacture(t, p = {}) {
  const doc = new jsPDF();
  const vente = t.type === "recette";
  const no =
    t.invoiceNo ||
    "F-" + (t.date || "").replace(/-/g, "") + "-" + String(t.id || "").slice(0, 4).toUpperCase();
  const [y, m, d] = (t.date || "").split("-");
  const items = t.items?.length
    ? t.items
    : [{ d: t.label || "Opération", q: 1, pu: Number(t.amount) }];

  let x = 14;
  if (p.photo) {
    try {
      doc.addImage(p.photo, "JPEG", 14, 12, 24, 24);
      x = 42;
    } catch (e) {}
  }
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.text(p.ent || `${p.prenom || ""} ${p.nom || ""}`.trim() || "Compta facile", x, 20);
  doc.setFontSize(9);
  doc.setTextColor(100);
  let ly = 26;
  if (p.ninea) { doc.text(`NINEA : ${p.ninea}`, x, ly); ly += 5; }
  if (p.adr) { doc.text(p.adr, x, ly); ly += 5; }
  if (p.tel) { doc.text(`Tél : ${p.tel}`, x, ly); }

  doc.setTextColor(16, 185, 129);
  doc.setFontSize(22);
  doc.text(vente ? "FACTURE" : "DEPENSE", 196, 20, { align: "right" });
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`N° ${no}`, 196, 27, { align: "right" });
  doc.text(`Date : ${d}/${m}/${y}`, 196, 33, { align: "right" });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(vente ? "Facturé à :" : "Fournisseur :", 14, 52);
  doc.setFontSize(12);
  doc.text(t.tiers || "Client comptant", 14, 59);

  autoTable(doc, {
    startY: 68,
    head: [["Désignation", "Qté", "Prix unitaire", "Total"]],
    body: items.map((i) => [i.d, String(i.q), fcfa(i.pu), fcfa(i.q * i.pu)]),
    headStyles: { fillColor: [16, 185, 129] },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });

  const total = items.reduce((s, i) => s + i.q * i.pu, 0);
  let fy = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL : ${fcfa(total)}`, 196, fy, { align: "right" });
  const paye = t.paid ?? total;
  if (vente && paye < total) {
    fy += 7;
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(`Déjà payé : ${fcfa(paye)}`, 196, fy, { align: "right" });
    fy += 6;
    doc.setTextColor(220, 38, 38);
    doc.text(`Reste à payer : ${fcfa(total - paye)}`, 196, fy, { align: "right" });
    doc.setTextColor(100);
  }
  fy += 9;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Mode de paiement : ${t.mode || "-"}`, 14, fy);
  doc.text("Merci pour votre confiance.", 105, 285, { align: "center" });

  doc.save(`facture-${no}.pdf`);
}
