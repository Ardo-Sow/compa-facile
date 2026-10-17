import { auth } from './_firebase.js';
import { SITE, PRICE, BASE, headers } from './_paydunya.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  let user;
  try {
    const idToken = (req.headers.authorization || '').replace('Bearer ', '');
    user = await auth.verifyIdToken(idToken);
  } catch (e) {
    return res.status(401).json({ error: 'Veuillez vous reconnecter.' });
  }

  try {
    const r = await fetch(`${BASE}/checkout-invoice/create`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        invoice: { total_amount: PRICE, description: 'Abonnement Compta facile (30 jours)' },
        store: { name: 'Compta facile' },
        actions: {
          callback_url: `${SITE}/api/paydunya-ipn`,
          return_url: `${SITE}/?paiement=succes`,
          cancel_url: `${SITE}/?paiement=annule`,
        },
        custom_data: { uid: user.uid },
      }),
    });
    const d = await r.json();
    if (d.response_code !== '00') {
      return res.status(400).json({ error: d.response_text || 'Création du paiement impossible' });
    }
    return res.status(200).json({ url: d.response_text });
  } catch (e) {
    return res.status(500).json({ error: 'Service de paiement indisponible' });
  }
}
