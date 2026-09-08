'use strict';

const DEFAULT_GATEWAY = Object.freeze({ name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiMode: 'responses', model: 'gpt-4.1-mini', webSearchCapable: true, extraHeaders: {} });
const DEFAULT_PROFILES = Object.freeze([
	{ id: 'geral', name: 'Geral', systemPrompt: 'Você é um assistente de atendimento cordial, claro e objetivo.' },
	{ id: 'suporte', name: 'Suporte técnico', systemPrompt: 'Você é um agente de suporte técnico. Faça diagnóstico cuidadoso, dê passos claros e não invente causas.' },
	{ id: 'comercial', name: 'Comercial', systemPrompt: 'Você é um agente comercial consultivo. Seja cordial, entenda a necessidade e não invente preços, prazos ou condições.' },
	{ id: 'revisor', name: 'Revisor factual', systemPrompt: 'Você revisa respostas com rigor factual. Sinalize incertezas e não afirme fatos sem suporte no contexto.' }
]);
const FORBIDDEN_HEADERS = new Set(['authorization', 'cookie', 'proxy-authorization', 'x-api-key', 'api-key', 'x-auth-token', 'cf-access-client-secret']);
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

function text(value, max) { return String(value || '').replace(/\0/g, '').trim().slice(0, max); }
function normalizeBaseUrl(value) {
	let url; try { url = new URL(text(value, 2000)); } catch (_) { throw new Error('URL base inválida.'); }
	if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(url.hostname))) throw new Error('A URL base deve usar HTTPS (HTTP apenas em localhost).');
	url.search = ''; url.hash = ''; return url.href.replace(/\/$/, '');
}
function normalizeHeaders(raw) {
	if (raw == null || raw === '') return {};
	let source = raw;
	if (typeof raw === 'string') { try { source = JSON.parse(raw); } catch (_) { throw new Error('Headers extras devem ser um objeto JSON.'); } }
	if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('Headers extras devem ser um objeto.');
	const result = {};
	for (const [name, value] of Object.entries(source)) {
		const key = text(name, 100);
		const lower = key.toLowerCase();
		if (!HEADER_NAME.test(key) || FORBIDDEN_HEADERS.has(lower) || /(^|[-_])(secret|token|password|credential|api[-_]?key)([-_]|$)/i.test(lower)) throw new Error(`Header extra não permitido: ${key || '(vazio)'}.`);
		if (typeof value !== 'string' || /[\r\n\0]/.test(value) || value.length > 2000) throw new Error(`Valor inválido para o header ${key}.`);
		result[key] = value;
	}
	if (Object.keys(result).length > 20) throw new Error('No máximo 20 headers extras são permitidos.');
	return result;
}
function normalizeGateway(raw = {}) {
	const apiMode = raw.apiMode === 'chat-completions' ? raw.apiMode : raw.apiMode === 'responses' || !raw.apiMode ? 'responses' : null;
	if (!apiMode) throw new Error('Modo de API inválido.');
	return { name: text(raw.name || DEFAULT_GATEWAY.name, 100) || DEFAULT_GATEWAY.name, baseUrl: normalizeBaseUrl(raw.baseUrl || DEFAULT_GATEWAY.baseUrl), apiMode, model: text(raw.model || DEFAULT_GATEWAY.model, 100) || DEFAULT_GATEWAY.model, webSearchCapable: raw.webSearchCapable !== false, extraHeaders: normalizeHeaders(raw.extraHeaders) };
}
function normalizeProfile(raw) {
	const name = text(raw?.name, 80); const systemPrompt = text(raw?.systemPrompt, 8000);
	if (!name) throw new Error('Informe o nome do perfil.');
	if (!systemPrompt) throw new Error('Informe o prompt de sistema.');
	let id = text(raw?.id, 80).toLowerCase().replace(/[^a-z0-9_-]/g, '');
	if (!id) id = `perfil-${Date.now().toString(36)}`;
	return { id, name, systemPrompt };
}
function normalizeProfiles(raw) {
	if (!Array.isArray(raw) || !raw.length || raw.length > 50) throw new Error('Mantenha entre 1 e 50 perfis.');
	const profiles = raw.map(normalizeProfile);
	if (new Set(profiles.map(item => item.id)).size !== profiles.length) throw new Error('Identificadores de perfil duplicados.');
	return profiles;
}
function resolveApiKey(entered, readSaved) {
	const apiKey = String(entered || '').trim();
	return apiKey || readSaved();
}
function selectionKey(accountId, conversationId) {
	const account = text(accountId, 500); const conversation = text(conversationId, 500);
	if (!account || !conversation) throw new Error('Conta e conversa são obrigatórias.');
	return `${encodeURIComponent(account)}:${encodeURIComponent(conversation)}`;
}
module.exports = { DEFAULT_GATEWAY, DEFAULT_PROFILES, FORBIDDEN_HEADERS, normalizeBaseUrl, normalizeHeaders, normalizeGateway, normalizeProfile, normalizeProfiles, resolveApiKey, selectionKey };
