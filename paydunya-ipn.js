import { db, Timestamp } from './_firebase.js';
import { PRICE, BASE, headers } from './_paydunya.js';

const DAY = 24 * 3600 * 1000;

export default async function handler(req, res) {
  try {
    const b = req.body || {};
    const token =
      b?.data?.invoice?.token ||
      b['data[invoice][token]'] ||
      req.query?.token;
    if (!token) return res.status(400).send('token manquant');

    // On revérifie toujours le paiement directement auprès de PayDunya
    const r = await fetch(`${BASE}/checkout-invoice/confirm/${token}`, { headers: headers() });
    const d = await r.json();
    if (d.status !== 'completed') return res.status(200).send('en attente');

    const uid = d.custom_data?.uid;
    if (!uid) return res.status(400).send('uid manquant');
    if (Number(d.invoice?.total_amount) !== PRICE) return res.status(400).send('montant invalide');

    const payRef = db.collection('payments').doc(token);
    const userRef = db.collection('users').doc(uid);

    await db.runTransaction(async (t) => {
      const [pay, snap] = await Promise.all([t.get(payRef), t.get(userRef)]);
      if (pay.exists || !snap.exists) return; // déjà traité ou utilisateur introuvable
      const u = snap.data();
      const fin = u.subscriptionEndDate?.toMillis?.() || 0;
      const debut = Math.max(Date.now(), fin);
      const now = Timestamp.now();

      t.set(payRef, {
        userId: uid,
        userName: `${u.prenom || ''} ${u.nom || ''}`.trim(),
        method: 'PayDunya',
        reference: token,
        status: 'validated',
        createdAt: now,
      });

      const maj = {
        subscriptionEndDate: Timestamp.fromMillis(debut + 30 * DAY),
        paymentMethod: 'PayDunya',
        paymentReference: token,
        paymentValidationStatus: 'validated',
      };
      if (u.subscriptionStatus !== 'suspended') {
        maj.subscriptionStatus = 'active';
        maj.subscriptionStartDate = now;
      }
      t.update(userRef, maj);
      t.set(userRef.collection('notifications').doc(), {
        msg: "Paiement reçu : 30 jours d'abonnement ajoutés.",
        read: false,
      });
    });

    return res.status(200).send('ok');
  } catch (e) {
    return res.status(500).send('erreur');
  }
}
