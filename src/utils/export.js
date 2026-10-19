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
    .reduce((s, t) => s + Number(t.montant), 0);
  const depenses = liste
    .filter((t) => t.type === "depense")
    .reduce((s, t) => s + Number(t.montant), 0);
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
      x.categorie || "",
      x.description || "",
      fcfa(x.montant),
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
    Catégorie: x.categorie || "",
    Description: x.description || "",
    "Montant (FCFA)": Number(x.montant),
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
