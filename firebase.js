import {initializeApp} from 'firebase/app';import {getAuth} from 'firebase/auth';import {getFirestore} from 'firebase/firestore';import {getStorage} from 'firebase/storage';
const app=initializeApp({apiKey:import.meta.env.VITE_API_KEY,authDomain:import.meta.env.VITE_AUTH_DOMAIN,projectId:import.meta.env.VITE_PROJECT_ID,storageBucket:import.meta.env.VITE_STORAGE_BUCKET,messagingSenderId:import.meta.env.VITE_SENDER_ID,appId:import.meta.env.VITE_APP_ID});
export const auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);
