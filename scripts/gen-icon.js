// Gera assets/icon.png (e variações) a partir de um SVG inline, usando o Electron local.
const { app, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#34d399"/>
      <stop offset="1" stop-color="#059669"/>
    </linearGradient>
  </defs>
  <path fill="url(#g)" d="M356 88H156c-41.4 0-75 33.6-75 75v150c0 41.4 33.6 75 75 75h60v75c0 21.9 25.1 33.5 41.6 19.3l64.1-54.3c10.3-8.7 25.5-13 40.8-13h33.5c41.4 0 75-33.6 75-75V163c0-41.4-33.6-75-75-75z"/>
  <circle fill="#ffffff" cx="176" cy="238" r="28"/>
  <circle fill="#ffffff" cx="256" cy="238" r="28"/>
  <circle fill="#ffffff" cx="336" cy="238" r="28"/>
</svg>`;

const svgScaled = (s) => svg.replace('viewBox="0 0 512 512"', `width="${s}" height="${s}" viewBox="0 0 512 512"`);

app.whenReady().then(() => {
	const assets = path.join(__dirname, "..", "assets");
	const dataUrl = "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
	const img = nativeImage.createFromDataURL(dataUrl);
	const png512 = img.resize({ width: 512, height: 512 });
	fs.writeFileSync(path.join(assets, "icon.png"), png512.toPNG());
	fs.writeFileSync(path.join(assets, "icon-256.png"), img.resize({ width: 256, height: 256 }).toPNG());
	fs.writeFileSync(path.join(assets, "icon-128.png"), img.resize({ width: 128, height: 128 }).toPNG());
	console.log("Ícones gerados:", ["icon.png", "icon-256.png", "icon-128.png"].map(f => path.join(assets, f)));
	app.quit();
});
