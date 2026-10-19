import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, addDoc, onSnapshot, deleteDoc, doc, query } from "firebase/firestore";

export default function DettesCreances(){
  const [list,setList]=useState([]);
  const [f,setF]=useState({nom:"", type:"dette", montant:"", echeance:""});
  const uid = auth.currentUser?.uid;
  
  useEffect(()=>{
    if(!uid) return;
    const q = query(collection(db,`users/${uid}/dettes`));
    return onSnapshot(q, s=>setList(s.docs.map(d=>({id:d.id,...d.data()}))));
  },[uid]);
  
  const save = async (e)=>{
    e.preventDefault();
    if(!f.nom || !f.montant) return;
    await addDoc(collection(db,`users/${uid}/dettes`), {...f, montant:Number(f.montant), createdAt:Date.now()});
    setF({nom:"", type:"dette", montant:"", echeance:""});
  };
  
  const totalDette = list.filter(x=>x.type==='dette').reduce((s,x)=>s+Number(x.montant||0),0);
  const totalCreance = list.filter(x=>x.type==='creance').reduce((s,x)=>s+Number(x.montant||0),0);
  
  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dettes & Créances</h1>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-red-50 p-3 rounded-xl border">Dettes: <b className="text-red-600">{totalDette} F</b></div>
        <div className="bg-emerald-50 p-3 rounded-xl border">Créances: <b className="text-emerald-600">{totalCreance} F</b></div>
      </div>
      <form onSubmit={save} className="flex gap-2 flex-wrap mb-6 bg-white p-3 rounded-xl shadow">
        <input placeholder="Nom / Entreprise" value={f.nom} onChange={e=>setF({...f,nom:e.target.value})} className="border p-2 rounded-xl flex-1" required/>
        <select value={f.type} onChange={e=>setF({...f,type:e.target.value})} className="border p-2 rounded-xl"><option value="dette">Dette</option><option value="creance">Créance</option></select>
        <input type="number" placeholder="Montant" value={f.montant} onChange={e=>setF({...f,montant:e.target.value})} className="border p-2 rounded-xl w-28" required/>
        <input type="date" value={f.echeance} onChange={e=>setF({...f,echeance:e.target.value})} className="border p-2 rounded-xl"/>
        <button className="bg-slate-900 text-white px-4 py-2 rounded-xl">Ajouter</button>
      </form>
      <div className="space-y-2">{list.map(x=><div key={x.id} className="flex justify-between items-center bg-white p-3 rounded-xl shadow"><span>{x.nom} - {x.type} - {x.montant} F {x.echeance?`- ${x.echeance}`:''}</span><button onClick={()=>deleteDoc(doc(db,`users/${uid}/dettes`,x.id))} className="text-red-500 font-bold">X</button></div>)}</div>
    </div>
  );
}
