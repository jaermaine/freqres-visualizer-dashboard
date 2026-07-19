const payload = {
  urls: ["https://squig.link/?share=Harman_Target"],
  image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
};

fetch('https://freqres.vercel.app/api/share', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(res => res.text())
.then(async text => {
  console.log('Raw response:', text);
  try {
    const data = JSON.parse(text);
    console.log('Share response:', data);
    if (data.id) {
      const imgRes = await fetch(`https://freqres.vercel.app/api/og-image?id=${data.id}`);
      console.log('OG Image status:', imgRes.status, imgRes.headers.get('content-type'));
      const buffer = await imgRes.arrayBuffer();
      console.log('Image size:', buffer.byteLength);
    }
  } catch (e) {}
})
.catch(console.error);
