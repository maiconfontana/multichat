'use strict';

const path = require('node:path');

const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const OUTPUT_SIZE = 128;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']);

function isSafeAccountId(id) {
	return typeof id === 'string' && /^[A-Za-z0-9]+$/.test(id);
}

function avatarsDir(userData) {
	return path.join(userData, 'avatars');
}

function avatarFilePath(userData, id) {
	if (!isSafeAccountId(id)) throw new Error('Identificador de conta inválido.');
	return path.join(avatarsDir(userData), `${id}.png`);
}

function coverCropRect(width, height) {
	const w = Math.max(0, Math.floor(Number(width) || 0));
	const h = Math.max(0, Math.floor(Number(height) || 0));
	const side = Math.min(w, h);
	return {
		x: Math.max(0, Math.floor((w - side) / 2)),
		y: Math.max(0, Math.floor((h - side) / 2)),
		width: side,
		height: side
	};
}

function parseImageDataUrl(dataUrl) {
	if (typeof dataUrl !== 'string' || dataUrl.length > MAX_INPUT_BYTES * 2) return null;
	const match = dataUrl.trim().match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
	if (!match) return null;
	const mime = match[1].toLowerCase();
	if (!ALLOWED_TYPES.has(mime) && mime !== 'image/jpg') return null;
	let buffer;
	try {
		buffer = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
	} catch {
		return null;
	}
	if (!buffer.length || buffer.length > MAX_INPUT_BYTES) return null;
	return { mime: mime === 'image/jpg' ? 'image/jpeg' : mime, buffer };
}

function pngDataUrl(pngBuffer) {
	if (!Buffer.isBuffer(pngBuffer) || !pngBuffer.length) return null;
	return `data:image/png;base64,${pngBuffer.toString('base64')}`;
}

function processAccountAvatar(nativeImage, dataUrl) {
	const parsed = parseImageDataUrl(dataUrl);
	if (!parsed) throw new Error('Use uma imagem PNG, JPEG, WebP ou GIF de até 5 MB.');
	let img = nativeImage.createFromBuffer(parsed.buffer);
	if (!img || img.isEmpty()) img = nativeImage.createFromDataURL(dataUrl);
	if (!img || img.isEmpty()) throw new Error('Não foi possível ler a imagem.');
	const size = img.getSize();
	if (!size.width || !size.height) throw new Error('Imagem inválida.');
	const crop = coverCropRect(size.width, size.height);
	if (!crop.width) throw new Error('Imagem inválida.');
	const square = img.crop(crop).resize({
		width: OUTPUT_SIZE,
		height: OUTPUT_SIZE,
		quality: 'best'
	});
	const png = square.toPNG();
	if (!png || !png.length) throw new Error('Não foi possível processar a imagem.');
	return png;
}

module.exports = {
	MAX_INPUT_BYTES,
	OUTPUT_SIZE,
	isSafeAccountId,
	avatarsDir,
	avatarFilePath,
	coverCropRect,
	parseImageDataUrl,
	pngDataUrl,
	processAccountAvatar
};
