(async () => {
  const url = 'http://localhost:3000/api/analyze-url';
  const body = { url: 'https://google-drive-sharefiles.net' };
  try {
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const text = await resp.text();
    console.log('status', resp.status);
    console.log('body:');
    console.log(text);
  } catch (e) {
    console.error('request error', e.message || e);
  }
})();
