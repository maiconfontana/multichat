'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
	coverCropRect,
	parseImageDataUrl,
	pngDataUrl,
	avatarFilePath,
	isSafeAccountId
} = require('../src/account-avatar');

test('recorte central cobre o menor lado', () => {
	assert.deepEqual(coverCropRect(200, 100), { x: 50, y: 0, width: 100, height: 100 });
	assert.deepEqual(coverCropRect(80, 200), { x: 0, y: 60, width: 80, height: 80 });
	assert.deepEqual(coverCropRect(40, 40), { x: 0, y: 0, width: 40, height: 40 });
});

test('aceita data URL de imagem e rejeita o resto', () => {
	const png = pngDataUrl(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
	const parsed = parseImageDataUrl(png);
	assert.equal(parsed.mime, 'image/png');
	assert.equal(parsed.buffer.length, 4);
	assert.equal(parseImageDataUrl('https://example.com/a.png'), null);
	assert.equal(parseImageDataUrl('data:text/plain;base64,YQ=='), null);
	assert.equal(parseImageDataUrl('data:image/svg+xml;base64,YQ=='), null);
});

test('caminho do avatar fica isolado em userData', () => {
	assert.equal(isSafeAccountId('Ab12cd'), true);
	assert.equal(isSafeAccountId('../x'), false);
	assert.equal(
		avatarFilePath('/tmp/multichat', 'acct1'),
		path.join('/tmp/multichat', 'avatars', 'acct1.png')
	);
	assert.throws(() => avatarFilePath('/tmp/multichat', '../x'));
});
