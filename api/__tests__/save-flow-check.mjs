// End-to-end test of the save-combination flow against PRODUCTION using a
// real session: signin -> POST /api/combinations with the returned cookie ->
// GET /api/combinations to verify it's listed.
// Usage: node api/__tests__/save-flow-check.mjs <email> <password>

const BASE = 'https://sunsip.netlify.app';
const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('usage: node save-flow-check.mjs <email> <password>');
  process.exit(1);
}

const signinRes = await fetch(`${BASE}/api/auth-signin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const setCookie = signinRes.headers.get('set-cookie') || '';
const token = (setCookie.match(/sunsip_token=([^;]+)/) || [])[1];
console.log('signin:', signinRes.status, '| cookie:', token ? 'yes' : 'NO');
if (!token) process.exit(1);

const postRes = await fetch(`${BASE}/api/combinations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: `sunsip_token=${token}` },
  body: JSON.stringify({
    cityName: 'SaveFlowCheck',
    countryName: 'Testland',
    cityImageUrl: 'https://example.com/city.jpg',
    weatherDetails: '{"temperature":20,"condition":"Sunny"}',
    cocktailName: 'Checker Daiquiri',
    cocktailImageUrl: 'https://example.com/cocktail.jpg',
    cocktailIngredients: ['rum', 'lime'],
    cocktailRecipe: ['shake', 'pour'],
  }),
});
console.log('POST combinations:', postRes.status, await postRes.text().then(t => t.slice(0, 120)));

const getRes = await fetch(`${BASE}/api/combinations`, {
  headers: { Cookie: `sunsip_token=${token}` },
});
const list = await getRes.json();
const mine = (list.combinations || []).filter(c => c.cityName === 'SaveFlowCheck');
console.log('GET combinations:', getRes.status, '| total visible:', (list.combinations || []).length, '| mine:', mine.length);