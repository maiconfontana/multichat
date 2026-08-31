// Gera derivados do ícone do app a partir do PNG mestre (512px):
//   icon-256.png, icon-128.png, icon-32.png e icon.ico (container ICO
//   com PNGs embutidos — formato suportado pelo Windows Vista+).
// Segurança: se um resize resultar em buffer vazio, o arquivo NÃO é
// sobrescrito (evita destruir ícones bons em ambientes onde o
// rasterizador falha).
const { app, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];
const PNG_SIZES = [256, 128, 32];

// Monta um arquivo .ICO usando entradas PNG (aceito pelo Windows).
const buildIco = (pngBuffers) => {
	const count = pngBuffers.length;
	const header = Buffer.alloc(6);
	header.writeUInt16LE(0, 0);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(count, 4);

	const entries = [];
	let offset = 6 + 16 * count;
	pngBuffers.forEach(({ size, buf }) => {
		const e = Buffer.alloc(16);
		e[0] = size >= 256 ? 0 : size;
		e[1] = size >= 256 ? 0 : size;
		e.writeUInt16LE(1, 4);
		e.writeUInt16LE(32, 6);
		e.writeUInt32LE(buf.length, 8);
		e.writeUInt32LE(offset, 12);
		offset += buf.length;
		entries.push(e);
	});

	return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buf)]);
};

app.whenReady().then(() => {
	const assets = path.join(__dirname, "..", "assets");
	const masterPath = path.join(assets, "icon.png");
	const master = nativeImage.createFromPath(masterPath);

	if (master.isEmpty()) {
		console.error(`Ícone mestre inválido ou vazio: ${masterPath}`);
		app.exit(1);
		return;
	}

	const written = [`icon.png (mestre, ${master.getSize().width}px)`];

	for (const size of PNG_SIZES) {
		const png = master.resize({ width: size, height: size }).toPNG();
		if (!png || png.length === 0) {
			console.warn(`Aviso: resize ${size}px resultou vazio — mantendo arquivo existente.`);
			continue;
		}
		fs.writeFileSync(path.join(assets, `icon-${size}.png`), png);
		written.push(`icon-${size}.png`);
	}

	const pngs = ICO_SIZES
		.map(size => ({ size, buf: master.resize({ width: size, height: size }).toPNG() }))
		.filter(p => p.buf && p.buf.length > 0);

	if (pngs.length > 0) {
		fs.writeFileSync(path.join(assets, "icon.ico"), buildIco(pngs));
		written.push(`icon.ico (${pngs.length} imagens)`);
	} else {
		console.warn("Aviso: não foi possível gerar o ICO (resizes vazios).");
	}

	console.log("Ícones ok:", written.join(", "));
	app.quit();
});
