// Local check for api/auth-forgot.js + api/auth-reset.js against real MongoDB.
// Run via run-reset-check.mjs (esbuild bundle, CJS): verifies token round-trip,
// single-use burn, wrong-token rejection, old/new password signin.

const post = (handler, body) =>
  handler(
    new Request('http://localhost/.netlify/functions/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:8888' },
      body: JSON.stringify(body),
    })
  );

const EMAIL = `reset-check-${Date.now()}@example.com`;

async function main() {
  const { default: handlerSignup } = await import('../auth-signup.js');
  const { default: handlerForgot } = await import('../auth-forgot.js');
  const { default: handlerReset } = await import('../auth-reset.js');
  const { default: handlerSignin } = await import('../auth-signin.js');

  let res = await post(handlerSignup, { email: EMAIL, password: 'oldpass1' });
  console.log('signup:', res.status);
  if (res.status !== 201) return;

  res = await post(handlerForgot, { email: EMAIL });
  const forgotBody = await res.json();
  console.log('forgot:', res.status, '| delivered:', forgotBody.delivered);
  const resetUrl = forgotBody.resetUrl || '';
  const token = resetUrl.split('#reset-token=')[1] || '';
  console.log('token received:', token.length > 20);

  res = await post(handlerForgot, { email: `nobody-${Date.now()}@example.com` });
  const enumBody = await res.json();
  console.log('unknown email:', res.status, '| has resetUrl:', 'resetUrl' in enumBody);

  res = await post(handlerReset, { token: 'a'.repeat(64), password: 'newpass1' });
  console.log('wrong token:', res.status, '(expect 400)');

  res = await post(handlerReset, { token, password: 'newpass1' });
  const resetBody = await res.json();
  console.log('reset:', res.status, '| user:', resetBody.user?.email ?? 'none');
  const setCookie = res.headers.get('set-cookie') || '';
  console.log('auth cookie set:', setCookie.includes('sunsip_token'));

  res = await post(handlerReset, { token, password: 'another1' });
  console.log('token reuse:', res.status, '(expect 400)');

  res = await post(handlerSignin, { email: EMAIL, password: 'oldpass1' });
  console.log('old password:', res.status, '(expect 401)');
  res = await post(handlerSignin, { email: EMAIL, password: 'newpass1' });
  console.log('new password:', res.status, '(expect 200)');

  console.log('DONE');
}

main();