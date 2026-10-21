import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, onSnapshot, deleteDoc, updateDoc, doc } from "firebase/firestore";
import { wa, norm, msgRelanceClient } from "../utils/whatsapp";

const F = (n) => Math.round(n || 0).toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ") + " FCFA";
const DT = (d) => (d ? d.split("-").reverse().join("/") : "");
const card = "bg-white dark:bg-[#0f2540] border border-slate-200 dark:border-slate-700 rounded-2xl p-4 mb-3";
const inp = "border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2.5 rounded-xl";

export default function Clients({ p, tx, cl }) {
  const uid = p.id;
  const [cmds, setCmds] = useState([]);
  const [f, setF] = useState({ nom: "", tel: "", adr: "" });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);

  useEffect(
    () =>
      onSnapshot(collection(db, `users/${uid}/commandes`), (s) =>
        setCmds(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      ),
    [uid]
  );

  const save = async (e) => {
    e.preventDefault();
    const nom = f.nom.trim();
    if (!nom) return;
    if (cl.some((c) => norm(c.nom) === norm(nom))) return alert("Ce client existe déjà.");
    await addDoc(collection(db, `users/${uid}/clients`), {
      nom,
      tel: f.tel.trim(),
      adr: f.adr.trim(),
      createdAt: Date.now(),
    });
    setF({ nom: "", tel: "", adr: "" });
  };

  const info = (c) => {
    const fa = tx.filter((t) => t.type === "recette" && norm(t.tiers) === norm(c.nom));
    const total = fa.reduce((s, t) => s + t.amount, 0);
    const reste = fa.reduce((s, t) => s + t.amount - (t.paid ?? t.amount), 0);
    const co = cmds.filter((x) => norm(x.client) === norm(c.nom));
    return { fa, total, reste, co, nl: co.filter((x) => x.statut !== "livree").length };
  };

  const liste = cl
    .map((c) => ({ c, i: info(c) }))
    .filter(({ c }) => (c.nom + " " + (c.tel || "")).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.i.reste - a.i.reste || a.c.nom.localeCompare(b.c.nom));

  const totalDu = liste.reduce((s, x) => s + x.i.reste, 0);

  return (
    <div>
      <h2 className="text-xl font-bold mb-3">Clients</h2>

      <div className={card}>
        <div className="text-sm text-slate-500">Total à encaisser ({liste.length} client(s))</div>
        <div className={`text-xl font-bold ${totalDu > 0 ? "text-red-500" : "text-emerald-500"}`}>{F(totalDu)}</div>
      </div>

      <form onSubmit={save} className={card + " flex gap-2 flex-wrap"}>
        <input placeholder="Nom du client" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} className={inp + " flex-1 min-w-[140px]"} required />
        <input type="tel" placeholder="Téléphone (WhatsApp)" value={f.tel} onChange={(e) => setF({ ...f, tel: e.target.value })} className={inp + " flex-1 min-w-[140px]"} />
        <input placeholder="Adresse (facultatif)" value={f.adr} onChange={(e) => setF({ ...f, adr: e.target.value })} className={inp + " flex-1 min-w-[140px]"} />
        <button className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold">Ajouter</button>
      </form>

      <input placeholder="Rechercher un client…" value={q} onChange={(e) => setQ(e.target.value)} className={inp + " w-full mb-3"} />

      {liste.map(({ c, i }) => (
        <div key={c.id} className={card}>
          <div className="flex justify-between items-center gap-2 cursor-pointer" onClick={() => setOpen(open === c.id ? null : c.id)}>
            <div>
              <b>{c.nom}</b>
              <div className="text-xs text-slate-500">
                {c.tel || "Pas de téléphone"} · {i.fa.length} facture(s) · facturé {F(i.total)}
                {i.nl > 0 && ` · ${i.nl} commande(s) à livrer`}
              </div>
            </div>
            <div className={`font-bold text-right ${i.reste > 0 ? "text-red-500" : "text-emerald-500"}`}>
              {i.reste > 0 ? "Doit " + F(i.reste) : "À jour ✅"}
            </div>
          </div>

          {open === c.id && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="flex gap-2 flex-wrap mb-3">
                <input
                  key={c.id + (c.tel || "")}
                  type="tel"
                  placeholder="Téléphone"
                  defaultValue={c.tel || ""}
                  onBlur={(e) => e.target.value.trim() !== (c.tel || "") && updateDoc(doc(db, `users/${uid}/clients`, c.id), { tel: e.target.value.trim() })}
                  className={inp + " flex-1 min-w-[140px]"}
                />
                {i.reste > 0 && (
                  <button onClick={() => wa(c.tel, msgRelanceClient(c.nom, i.reste, p))} className="bg-emerald-500 text-white px-3 py-2 rounded-xl text-sm font-semibold">
                    💬 Relancer ({F(i.reste)})
                  </button>
                )}
                {c.tel && (
                  <button onClick={() => wa(c.tel, `Bonjour ${c.nom}, `)} className="border border-slate-300 dark:border-slate-600 px-3 py-2 rounded-xl text-sm">
                    💬 Écrire
                  </button>
                )}
              </div>

              <b className="text-sm">Factures / ventes</b>
              {i.fa.map((t) => {
                const reste = t.amount - (t.paid ?? t.amount);
                return (
                  <div key={t.id} className="flex justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span>{DT(t.date)} · {t.invoiceNo || t.label}</span>
                    <span className={reste > 0 ? "text-red-500" : "text-emerald-500"}>
                      {F(t.amount)} {reste > 0 ? `(reste ${F(reste)})` : "✅"}
                    </span>
                  </div>
                );
              })}
              {!i.fa.length && <p className="text-sm text-slate-500">Aucune facture.</p>}

              <b className="text-sm block mt-3">Commandes</b>
              {i.co.map((x) => (
                <div key={x.id} className="flex justify-between text-sm py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span>{DT(x.dateCommande)} · {x.produit}</span>
                  <span>{x.statut === "livree" ? "✅ Livrée" : "⏳ Non livrée"}</span>
                </div>
              ))}
              {!i.co.length && <p className="text-sm text-slate-500">Aucune commande.</p>}

              <button
                onClick={() => confirm(`Supprimer la fiche de ${c.nom} ? (ses factures sont conservées)`) && deleteDoc(doc(db, `users/${uid}/clients`, c.id))}
                className="mt-3 text-sm text-red-500"
              >
                🗑️ Supprimer ce client
              </button>
            </div>
          )}
        </div>
      ))}
      {!liste.length && <p className="text-slate-500">Aucun client. Ils s'ajoutent aussi tout seuls quand vous créez une facture ou une commande.</p>}
    </div>
  );
}
