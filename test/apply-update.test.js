'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
	isTrustedDownloadUrl,
	parseSha256Sums,
	expectedHash,
	excerptNotes,
	sha256File,
	macBundlePath,
	findAppBundle
} = require('../src/apply-update');

test('só aceita downloads HTTPS do GitHub do projeto', () => {
	assert.equal(isTrustedDownloadUrl('https://github.com/maiconfontana/multichat/releases/download/v1.7.0/MultiChat-1.7.0.AppImage'), true);
	assert.equal(isTrustedDownloadUrl('https://objects.githubusercontent.com/foo'), true);
	assert.equal(isTrustedDownloadUrl('https://evil.example/MultiChat.AppImage'), false);
	assert.equal(isTrustedDownloadUrl('http://github.com/maiconfontana/multichat/releases/download/x'), false);
});

test('parseia SHA256SUMS e casa o arquivo pelo basename', () => {
	const sums = parseSha256Sums('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa  MultiChat-1.7.0.AppImage\nbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb *MultiChat-1.7.0-mac-arm64.zip\n');
	assert.equal(expectedHash(sums, 'MultiChat-1.7.0.AppImage'), 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
	assert.equal(expectedHash(sums, '/tmp/MultiChat-1.7.0-mac-arm64.zip'), 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
	assert.equal(expectedHash(sums, 'outro.bin'), null);
});

test('resume o changelog sem markdown pesado', () => {
	assert.match(excerptNotes('## Novidades\n\n- **logo** por conta\n- hibernar todas'), /logo por conta/);
	assert.equal(excerptNotes(''), 'Confira o changelog na página da versão.');
	assert.ok(excerptNotes('x'.repeat(800)).endsWith('…'));
});

test('sha256File bate com o hash conhecido', async () => {
	const file = path.join(os.tmpdir(), `multichat-hash-${Date.now()}.txt`);
	fs.writeFileSync(file, 'multi');
	assert.equal(await sha256File(file), '4bd77cffb0da8cbda839ed5caaf5d418f19addc5941776e87261e000d6f96e93');
	fs.unlinkSync(file);
});

test('macBundlePath sobe de Contents/MacOS até o .app', () => {
	assert.equal(macBundlePath('/Applications/MultiChat.app/Contents/MacOS/MultiChat'), '/Applications/MultiChat.app');
	assert.equal(macBundlePath('/usr/bin/electron'), null);
});

test('findAppBundle acha o primeiro .app', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'multichat-bundle-'));
	fs.mkdirSync(path.join(root, 'nested', 'MultiChat.app'), { recursive: true });
	assert.equal(findAppBundle(root), path.join(root, 'nested', 'MultiChat.app'));
	fs.rmSync(root, { recursive: true, force: true });
});
