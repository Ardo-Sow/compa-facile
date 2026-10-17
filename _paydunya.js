export const SITE = 'https://compta-facile.vercel.app';
export const PRICE = 5000;
export const BASE =
  process.env.PAYDUNYA_MODE === 'live'
    ? 'https://app.paydunya.com/api/v1'
    : 'https://app.paydunya.com/sandbox-api/v1';

export const headers = () => ({
  'Content-Type': 'application/json',
  'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY,
  'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY,
  'PAYDUNYA-TOKEN': process.env.PAYDUNYA_TOKEN,
});
