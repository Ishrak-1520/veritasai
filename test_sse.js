const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
async function test() {
  const res = await fetch('http://localhost:3000/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'url', url: 'https://picsum.photos/id/1/800/600.jpg' })
  });
  
  if (!res.body) {
    console.error('No response body');
    return;
  }
  
  console.log('Status:', res.status);
  console.log('Headers:', res.headers.raw());
  
  let i = 0;
  for await (const chunk of res.body) {
    if (i++ > 15) break; 
    console.log('CHUNK:', chunk.toString());
  }
}
test();
