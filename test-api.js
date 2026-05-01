async function test() {
  try {
    const res = await fetch('http://localhost:4000/api/users');
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}
test();
