fetch('http://localhost:3000/api/services/ab516ac3-18d8-4fb1-8073-503bb6b23323', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Genesis Car Wash'
  })
}).then(res => res.json()).then(console.log);
