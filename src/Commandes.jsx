import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, addDoc, onSnapshot, deleteDoc, updateDoc, doc, query } from "firebase/firestore";
import { wa, norm, msgCommande } from "../utils/whatsapp";

const TD = () => new Date().toISOString().slice(0, 10);
const F = (n) => Math.round(n || 0).toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ") + " FCFA";
const DT = (d) => (d ? d.split("-").reverse().join("/") : "");
const card = "bg-white dark:bg-[#0f2540] border border-slate-200 dark:border-slate-700 rounded-2xl p-4 mb-3";
const inp = "border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-2.5 rounded-xl";
const VIDE = { client: "", produit: "", montant: "", dateCommande: TD(), dateLivraison: "" };

export default function Commandes({ p, cl = [] }) {
  const uid = p.id;
  const [list, setList] = useState([]);
  const [f, setF] = useState(VIDE);
  const [filtre, setFiltre] = useState("tout");

  useEffect(() => {
    const q = query(collection(db, `users/${uid}/commandes`));
    return onSnapshot(q, (s) =>
      setList(
        s.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      )
    );
  }, [uid]);

  const save = async (e) => {
    e.preventDefault();
    if (!f.client.trim() || !f.produit.trim()) return;
    if (!cl.some((x) => norm(x.nom) === norm(f.client)))
      await addDoc(collection(db, `users/${uid}/clients`), { nom: f.client.trim(), tel: "", adr: "", createdAt: Date.now() });
    await addDoc(collection(db, `users/${uid}/commandes`), {
      client: f.client.trim(),
      produit: f.produit.trim(),
      montant: Number(f.montant) || 0,
      dateCommande: f.dateCommande,
      dateLivraison: f.dateLivraison,
      statut: "non_livree",
      createdAt: Date.now(),
    });
    setF(VIDE);
  };

  const basculer = (x) =>
    updateDoc(doc(db, `users/${uid}/commandes`, x.id), {
      statut: x.statut === "livree" ? "non_livree" : "livree",
      livreeLe: x.statut === "livree" ? null : TD(),
    });

  const nonLivrees = list.filter((x) => x.statut !== "livree");
  const livrees = list.filter((x) => x.statut === "livree");
  const somme = (a) => a.reduce((s, x) => s + Number(x.montant || 0), 0);
  const affichees = filtre === "tout" ? list : filtre === "livree" ? livrees : nonLivrees;

  return (
    <div>
      <h2 className="text-xl font-bold mb-3">Commandes</h2>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className={card + " !mb-0"}>
          <div className="text-sm text-slate-500">À livrer ({nonLivrees.length})</div>
          <div className="text-lg font-bold text-amber-500">{F(somme(nonLivrees))}</div>
        </div>
        <div className={card + " !mb-0"}>
          <div className="text-sm text-slate-500">Livrées ({livrees.length})</div>
          <div className="text-lg font-bold text-emerald-500">{F(somme(livrees))}</div>
        </div>
      </div>

      <form onSubmit={save} className={card + " flex gap-2 flex-wrap"}>
        <input placeholder="Nom du client" value={f.client} onChange={(e) => setF({ ...f, client: e.target.value })} list="clients-list" className={inp + " flex-1 min-w-[140px]"} required />
        <datalist id="clients-list">{cl.map((x) => <option key={x.id} value={x.nom} />)}</datalist>
        <input placeholder="Produit / commande" value={f.produit} onChange={(e) => setF({ ...f, produit: e.target.value })} className={inp + " flex-1 min-w-[140px]"} required />
        <input type="number" min="0" placeholder="Montant (FCFA)" value={f.montant} onChange={(e) => setF({ ...f, montant: e.target.value })} className={inp + " w-36"} />
        <label className="text-xs text-slate-500">Commandée le
          <input type="date" value={f.dateCommande} onChange={(e) => setF({ ...f, dateCommande: e.target.value })} className={inp + " block"} />
        </label>
        <label className="text-xs text-slate-500">Livraison prévue
          <input type="date" value={f.dateLivraison} onChange={(e) => setF({ ...f, dateLivraison: e.target.value })} className={inp + " block"} />
        </label>
        <button className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold self-end">Ajouter</button>
      </form>

      <div className="flex gap-2 mb-3">
        {[["tout", "Toutes"], ["non_livree", "Non livrées"], ["livree", "Livrées"]].map(([k, l]) => (
          <button key={k} onClick={() => setFiltre(k)} className={`px-3 py-1.5 rounded-xl text-sm font-semibold ${filtre === k ? "bg-emerald-500 text-white" : "border border-slate-300 dark:border-slate-600"}`}>{l}</button>
        ))}
      </div>

      {affichees.map((x) => {
        const ok = x.statut === "livree";
        const retard = !ok && x.dateLivraison && x.dateLivraison < TD();
        return (
          <div key={x.id} className={card + " flex justify-between items-center gap-2 flex-wrap"}>
            <div>
              <b>{x.client}</b> · {x.produit}
              <div className="text-xs text-slate-500">
                {F(x.montant)} · commandée le {DT(x.dateCommande)}
                {x.dateLivraison && ` · livraison prévue le ${DT(x.dateLivraison)}`}
                {ok && x.livreeLe && ` · livrée le ${DT(x.livreeLe)}`}
              </div>
              <span className={`text-xs font-bold ${ok ? "text-emerald-500" : retard ? "text-red-500" : "text-amber-500"}`}>
                {ok ? "✅ Livrée" : retard ? "⚠️ Non livrée (en retard)" : "⏳ Non livrée"}
              </span>
            </div>
            <span className="flex gap-2">
              <button onClick={() => basculer(x)} className={`px-3 py-1.5 rounded-xl text-sm font-semibold ${ok ? "border border-slate-300 dark:border-slate-600" : "bg-emerald-500 text-white"}`}>
                {ok ? "Remettre non livrée" : "Marquer livrée"}
              </button>
              <button title="WhatsApp" onClick={() => wa(cl.find((y) => norm(y.nom) === norm(x.client))?.tel, msgCommande(x, p))}>💬</button>
              <button onClick={() => confirm("Supprimer cette commande ?") && deleteDoc(doc(db, `users/${uid}/commandes`, x.id))}>🗑️</button>
            </span>
          </div>
        );
      })}
      {!affichees.length && <p className="text-slate-500">Aucune commande.</p>}
    </div>
  );
}
