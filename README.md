# Compta facile
1. Créez un projet Firebase ; activez Authentication (Email/Mot de passe), Firestore et Storage.
2. Collez firestore.rules et storage.rules dans l'onglet « Règles » de Firestore et de Storage.
3. Paramètres du projet > Vos applications > Web : copiez la config dans un fichier .env (modèle : .env.example).
4. `npm install` puis `npm run dev` pour tester en local.
5. Inscrivez-vous dans l'app, puis dans Firestore > users > votre document, changez `role` en `admin`.
6. Poussez sur GitHub, importez le dépôt dans Vercel, ajoutez les 6 variables VITE_* (Settings > Environment Variables), déployez.
7. Firebase > Authentication > Settings > Authorized domains : ajoutez votre domaine Vercel.
