'use strict';

const WHATSAPP_WEB = 'https://web.whatsapp.com/';
const TEAMS_WEB = 'https://teams.microsoft.com/v2/';

const DEEPLINK_SCHEMES = ['whatsapp', 'msteams', 'ms-teams'];

const WHATSAPP_HOSTS = new Set([
	'wa.me',
	'api.whatsapp.com',
	'web.whatsapp.com',
	'chat.whatsapp.com',
	'whatsapp.com'
]);

const TEAMS_HOSTS = new Set([
	'teams.microsoft.com',
	'teams.live.com'
]);

function hostnameOf(url) {
	return String(url.hostname || '').toLowerCase().replace(/^www\./, '');
}

function normalizePhone(raw) {
	if (raw == null) return '';
	const digits = String(raw).replace(/[^\d]/g, '');
	if (digits.length < 5 || digits.length > 15) return '';
	return digits;
}

function buildWhatsAppSend(phone, text) {
	if (!phone && !text) return WHATSAPP_WEB;
	const url = new URL('https://web.whatsapp.com/send');
	if (phone) url.searchParams.set('phone', phone);
	if (text) url.searchParams.set('text', text);
	return url.href;
}

function parseWhatsAppProtocol(url) {
	const action = hostnameOf(url);
	const phone = normalizePhone(url.searchParams.get('phone') || url.searchParams.get('abid'));
	const text = url.searchParams.get('text') || '';
	if (action === 'send' || action === 'open' || action === 'call' || phone || text)
		return { kind: 'whatsapp', loadUrl: buildWhatsAppSend(phone, text) };
	return { kind: 'whatsapp', loadUrl: WHATSAPP_WEB };
}

function parseWhatsAppHttps(url) {
	const host = hostnameOf(url);
	if (host === 'chat.whatsapp.com') {
		const code = url.pathname.replace(/^\//, '').split('/')[0];
		if (!code || !/^[A-Za-z0-9]+$/.test(code)) return { kind: 'whatsapp', loadUrl: WHATSAPP_WEB };
		return { kind: 'whatsapp', loadUrl: `https://chat.whatsapp.com/${code}` };
	}
	if (host === 'web.whatsapp.com') {
		if (/^\/send\/?$/i.test(url.pathname) || url.pathname === '/' || url.pathname === '') {
			if (/^\/send\/?$/i.test(url.pathname))
				return {
					kind: 'whatsapp',
					loadUrl: buildWhatsAppSend(normalizePhone(url.searchParams.get('phone')), url.searchParams.get('text') || '')
				};
			return { kind: 'whatsapp', loadUrl: WHATSAPP_WEB };
		}
		return null;
	}
	const first = url.pathname.replace(/^\//, '').split('/')[0];
	if (first && first !== 'send' && first !== 'message')
		return { kind: 'whatsapp', loadUrl: buildWhatsAppSend(normalizePhone(first), url.searchParams.get('text') || '') };
	return {
		kind: 'whatsapp',
		loadUrl: buildWhatsAppSend(normalizePhone(url.searchParams.get('phone')), url.searchParams.get('text') || '')
	};
}

function parseTeamsHttps(url) {
	const host = hostnameOf(url);
	if (!TEAMS_HOSTS.has(host)) return null;
	const out = new URL('https://teams.microsoft.com/');
	out.hostname = host;
	out.pathname = url.pathname || '/';
	out.search = url.search;
	out.hash = url.hash;
	if (out.pathname === '/' && !out.search && !out.hash)
		out.href = TEAMS_WEB;
	return { kind: 'teams', loadUrl: out.href };
}

function parseTeamsProtocol(url) {
	const host = hostnameOf(url);
	const https = new URL('https://teams.microsoft.com/');
	if (TEAMS_HOSTS.has(host)) https.hostname = host;
	https.pathname = url.pathname || '/';
	https.search = url.search;
	https.hash = url.hash;
	return parseTeamsHttps(https);
}

function parseDeeplink(raw) {
	if (typeof raw !== 'string') return null;
	const trimmed = raw.trim();
	if (!trimmed) return null;
	let url;
	try { url = new URL(trimmed); }
	catch { return null; }
	const protocol = url.protocol.toLowerCase();
	if (protocol === 'whatsapp:') return parseWhatsAppProtocol(url);
	if (protocol === 'msteams:' || protocol === 'ms-teams:') return parseTeamsProtocol(url);
	if (protocol !== 'http:' && protocol !== 'https:') return null;
	const host = hostnameOf(url);
	if (WHATSAPP_HOSTS.has(host)) return parseWhatsAppHttps(url);
	if (TEAMS_HOSTS.has(host)) return parseTeamsHttps(url);
	return null;
}

function matchingAccounts(accounts, kind) {
	if (!Array.isArray(accounts) || (kind !== 'whatsapp' && kind !== 'teams')) return [];
	return accounts.filter((account) => {
		const type = account && account.type ? account.type : 'whatsapp';
		const url = String(account && account.url || '');
		if (kind === 'whatsapp')
			return type === 'whatsapp' || /web\.whatsapp\.com|whatsapp\.com/i.test(url);
		if (type === 'teams') return true;
		return /teams\.microsoft\.com|teams\.live\.com/i.test(url);
	});
}

function findDeeplinkInArgv(argv) {
	if (!Array.isArray(argv)) return null;
	for (const arg of argv) {
		if (typeof arg !== 'string' || !arg || arg.startsWith('-')) continue;
		if (parseDeeplink(arg)) return arg;
	}
	return null;
}

function accountKind(type) {
	if (type === 'teams') return 'teams';
	if (type === 'whatsapp' || type == null || type === '') return 'whatsapp';
	return null;
}

module.exports = {
	WHATSAPP_WEB,
	TEAMS_WEB,
	DEEPLINK_SCHEMES,
	parseDeeplink,
	matchingAccounts,
	findDeeplinkInArgv,
	accountKind
};
