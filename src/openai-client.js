'use strict';

const { normalizeDraft } = require('./assistant-core');
const { normalizeGateway } = require('./assistant-settings');

function extractOutputText(data) {
	if (typeof data?.output_text === 'string') return normalizeDraft(data.output_text);
	const parts = [];
	for (const item of Array.isArray(data?.output) ? data.output : []) for (const content of Array.isArray(item?.content) ? item.content : []) if ((content?.type === 'output_text' || content?.type === 'text') && typeof content.text === 'string') parts.push(content.text);
	return normalizeDraft(parts.join('\n'));
}
function extractChatText(data) { return normalizeDraft(data?.choices?.[0]?.message?.content); }
function endpoint(baseUrl, mode) { return `${baseUrl.replace(/\/$/, '')}/${mode === 'responses' ? 'responses' : 'chat/completions'}`; }
function makeBody({ gateway, systemPrompt, userContext, webSearch }) {
	if (webSearch && !gateway.webSearchCapable) throw new Error('Este gateway não foi configurado com capacidade de pesquisa web.');
	if (gateway.apiMode === 'responses') {
		const body = { model: gateway.model, instructions: String(systemPrompt).slice(0, 8000), input: String(userContext).slice(0, 30000) };
		if (webSearch) body.tools = [{ type: 'web_search_preview' }];
		return body;
	}
	// Chat Completions não possui uma ferramenta de busca web interoperável.
	if (webSearch) throw new Error('Pesquisa web requer o modo Responses API.');
	return { model: gateway.model, messages: [{ role: 'system', content: String(systemPrompt).slice(0, 8000) }, { role: 'user', content: String(userContext).slice(0, 30000) }] };
}
async function requestCompletion({ apiKey, gateway: rawGateway, systemPrompt, userContext, webSearch = false, fetchImpl = globalThis.fetch, signal }) {
	if (!apiKey) throw new Error('Configure a chave do gateway.');
	if (typeof fetchImpl !== 'function') throw new Error('fetch indisponível.');
	const gateway = normalizeGateway(rawGateway);
	if (webSearch && !gateway.webSearchCapable) throw new Error('Este gateway não foi configurado com capacidade de pesquisa web.');
	const response = await fetchImpl(endpoint(gateway.baseUrl, gateway.apiMode), { method: 'POST', signal, headers: { ...gateway.extraHeaders, Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(makeBody({ gateway, systemPrompt, userContext, webSearch })) });
	let data = null; try { data = await response.json(); } catch (_) {}
	if (!response.ok) throw new Error(data?.error?.message ? `${gateway.name}: ${String(data.error.message).slice(0, 300)}` : `${gateway.name} respondeu HTTP ${response.status}.`);
	return gateway.apiMode === 'responses' ? extractOutputText(data) : extractChatText(data);
}
async function testConnection(options) { return requestCompletion({ ...options, systemPrompt: 'Responda somente OK.', userContext: 'Teste de conexão.', webSearch: false }); }
// Compatibilidade interna com o MVP anterior.
async function createResponse({ apiKey, model, input, webSearch, fetchImpl, signal }) { return requestCompletion({ apiKey, gateway: { model }, systemPrompt: 'Siga a instrução do usuário.', userContext: input, webSearch, fetchImpl, signal }); }
module.exports = { requestCompletion, testConnection, createResponse, extractOutputText, extractChatText, endpoint, makeBody };
