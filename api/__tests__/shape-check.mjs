// Verify the shape the FE sees: POST /api/combinations returns
// { combination: { _id, ... } } but the store/UI use `.id`. Confirm _id vs id
// mismatch on the saved-combination object.
const BASE = 'https://sunsip.netlify.app';
const email = 'pocpat@gmail.com';
const password = 'verify-pw-777';

const signinRes = await fetch(`${BASE}/api/auth-signin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const setCookie = signinRes.headers.get('set-cookie') || '';
const token = (setCookie.match(/sunsip_token=([^;]+)/) || [])[1];

const postRes = await fetch(`${BASE}/api/combinations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: `sunsip_token=${token}` },
  body: JSON.stringify({
    cityName: 'ShapeCheck',
    countryName: 'Testland',
    cityImageUrl: 'https://example.com/c.jpg',
    weatherDetails: '{}',
    cocktailName: 'Shape Sazerac',
    cocktailImageUrl: 'https://example.com/k.jpg',
    cocktailIngredients: ['a'],
    cocktailRecipe: ['b'],
  }),
});
const saved = (await postRes.json()).combination;
console.log('POST returns keys:', Object.keys(saved));
console.log('has .id?', 'id' in saved, '| has ._id?', '_id' in saved);

const getRes = await fetch(`${BASE}/api/combinations`, { headers: { Cookie: `sunsip_token=${token}` } });
const list = await getRes.json();
const mine = (list.combinations || []).find(c => c.cityName === 'ShapeCheck');
console.log('GET item keys:', Object.keys(mine ?? {}));
console.log('GET item has .id?', 'id' in (mine ?? {}));