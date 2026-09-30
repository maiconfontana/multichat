'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const TRUSTED_HOSTS = new Set([
	'github.com',
	'objects.githubusercontent.com',
	'release-assets.githubusercontent.com',
	'github-releases.githubusercontent.com'
]);

function shQuote(value) {
	return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function isTrustedDownloadUrl(raw) {
	try {
		const url = new URL(String(raw || ''));
		if (url.protocol !== 'https:') return false;
		if (url.hostname === 'github.com')
			return url.pathname.startsWith('/maiconfontana/multichat/');
		return TRUSTED_HOSTS.has(url.hostname);
	} catch {
		return false;
	}
}

function parseSha256Sums(text) {
	const map = new Map();
	for (const line of String(text || '').split(/\r?\n/)) {
		const match = line.trim().match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/);
		if (!match) continue;
		map.set(path.basename(match[2].trim()), match[1].toLowerCase());
	}
	return map;
}

function expectedHash(sums, filename) {
	if (!sums || typeof sums.get !== 'function') return null;
	return sums.get(path.basename(String(filename || ''))) || null;
}

function excerptNotes(notes, max = 360) {
	const text = String(notes || '').replace(/\r/g, '').trim();
	if (!text) return 'Confira o changelog na página da versão.';
	const plain = text
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/[#>*_`]/g, '')
		.replace(/\n{2,}/g, '\n')
		.trim();
	if (!plain) return 'Confira o changelog na página da versão.';
	if (plain.length <= max) return plain;
	return `${plain.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

async function sha256File(file) {
	const hash = crypto.createHash('sha256');
	const stream = fs.createReadStream(file);
	for await (const chunk of stream) hash.update(chunk);
	return hash.digest('hex');
}

function macBundlePath(execPath) {
	const macos = path.dirname(execPath);
	if (path.basename(macos) !== 'MacOS') return null;
	const contents = path.dirname(macos);
	if (path.basename(contents) !== 'Contents') return null;
	const bundle = path.dirname(contents);
	return /\.app$/i.test(bundle) ? bundle : null;
}

function findAppBundle(root) {
	if (!root || !fs.existsSync(root)) return null;
	const stack = [root];
	while (stack.length) {
		const dir = stack.pop();
		let entries = [];
		try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			if (entry.name === '__MACOSX') continue;
			const full = path.join(dir, entry.name);
			if (/\.app$/i.test(entry.name)) return full;
			stack.push(full);
		}
	}
	return null;
}

async function downloadFile(url, dest, fetchImpl = globalThis.fetch) {
	if (typeof fetchImpl !== 'function') throw new Error('fetch-unavailable');
	if (!isTrustedDownloadUrl(url)) throw new Error('url-not-trusted');
	const response = await fetchImpl(url, {
		headers: {
			Accept: 'application/octet-stream',
			'User-Agent': 'MultiChat'
		},
		redirect: 'follow'
	});
	if (!response || !response.ok)
		throw new Error(`http-${response ? response.status : 'unknown'}`);
	if (response.body && typeof Readable.fromWeb === 'function')
		await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(dest));
	else {
		const buffer = Buffer.from(await response.arrayBuffer());
		fs.writeFileSync(dest, buffer);
	}
}

async function readText(url, fetchImpl = globalThis.fetch) {
	if (typeof fetchImpl !== 'function') throw new Error('fetch-unavailable');
	if (!isTrustedDownloadUrl(url)) throw new Error('url-not-trusted');
	const response = await fetchImpl(url, {
		headers: {
			Accept: 'text/plain',
			'User-Agent': 'MultiChat'
		},
		redirect: 'follow'
	});
	if (!response || !response.ok)
		throw new Error(`http-${response ? response.status : 'unknown'}`);
	return response.text();
}

function spawnDetached(command, args) {
	const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: false });
	child.unref();
	return child;
}

function writeMacSwapScript({ pid, sourceApp, destApp }) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'multichat-update-'));
	const script = path.join(dir, 'swap.sh');
	const body = `#!/bin/bash
set -euo pipefail
for _ in $(seq 1 50); do
  if ! kill -0 ${Number(pid)} 2>/dev/null; then break; fi
  sleep 0.2
done
rm -rf ${shQuote(destApp)}
ditto ${shQuote(sourceApp)} ${shQuote(destApp)}
xattr -dr com.apple.quarantine ${shQuote(destApp)} 2>/dev/null || true
open ${shQuote(destApp)}
rm -rf ${shQuote(dir)}
`;
	fs.writeFileSync(script, body, { encoding: 'utf8', mode: 0o755 });
	return script;
}

function writeLinuxSwapScript({ pid, source, dest }) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'multichat-update-'));
	const script = path.join(dir, 'swap.sh');
	const body = `#!/bin/bash
set -euo pipefail
for _ in $(seq 1 50); do
  if ! kill -0 ${Number(pid)} 2>/dev/null; then break; fi
  sleep 0.2
done
chmod +x ${shQuote(source)}
mv -f ${shQuote(source)} ${shQuote(dest)}
${shQuote(dest)} >/dev/null 2>&1 &
rm -rf ${shQuote(dir)}
`;
	fs.writeFileSync(script, body, { encoding: 'utf8', mode: 0o755 });
	return script;
}

async function unpackMacZip(zipPath) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'multichat-app-'));
	await new Promise((resolve, reject) => {
		const child = spawn('ditto', ['-x', '-k', zipPath, dir], { stdio: 'ignore' });
		child.on('error', reject);
		child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`ditto-${code}`)));
	});
	const bundle = findAppBundle(dir);
	if (!bundle) throw new Error('app-bundle-missing');
	return bundle;
}

module.exports = {
	isTrustedDownloadUrl,
	parseSha256Sums,
	expectedHash,
	excerptNotes,
	sha256File,
	macBundlePath,
	findAppBundle,
	downloadFile,
	readText,
	spawnDetached,
	writeMacSwapScript,
	writeLinuxSwapScript,
	unpackMacZip
};
