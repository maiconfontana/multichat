'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { requestCompletion, createResponse, extractOutputText, extractChatText } = require('../src/openai-client');

function fetchCapture(result) {
	let request;
	return { get request() { return request; }, fetch: async (url, options) => { request = { url, options }; return { ok: true, json: async () => result }; } };
}

test('extrai respostas dos dois formatos', () => {
	assert.equal(extractOutputText({ output_text: '  resposta  ' }), 'resposta');
	assert.equal(extractChatText({ choices: [{ message: { content: ' chat ' } }] }), 'chat');
});

test('envia Responses API com busca sem expor chave no corpo', async () => {
	const capture = fetchCapture({ output_text: 'ok' });
	assert.equal(await createResponse({ apiKey: 'segredo', input: 'oi', webSearch: true, fetchImpl: capture.fetch }), 'ok');
	assert.equal(capture.request.url, 'https://api.openai.com/v1/responses');
	assert.deepEqual(JSON.parse(capture.request.options.body).tools, [{ type: 'web_search_preview' }]);
	assert.equal(capture.request.options.body.includes('segredo'), false);
});

test('envia Chat Completions ao endpoint e formato corretos', async () => {
	const capture = fetchCapture({ choices: [{ message: { content: 'feito' } }] });
	const gateway = { baseUrl: 'https://proxy.example/v1', apiMode: 'chat-completions', model: 'custom', webSearchCapable: false, extraHeaders: { 'X-Tenant': 'a' } };
	assert.equal(await requestCompletion({ apiKey: 'k', gateway, systemPrompt: 's', userContext: 'u', fetchImpl: capture.fetch }), 'feito');
	assert.equal(capture.request.url, 'https://proxy.example/v1/chat/completions');
	assert.deepEqual(JSON.parse(capture.request.options.body).messages, [{ role: 'system', content: 's' }, { role: 'user', content: 'u' }]);
	assert.equal(capture.request.options.headers['X-Tenant'], 'a');
});

test('busca respeita capability e requer Responses API', async () => {
	const noFetch = async () => { throw new Error('não deveria chamar fetch'); };
	await assert.rejects(requestCompletion({ apiKey: 'k', gateway: { webSearchCapable: false }, systemPrompt: '', userContext: '', webSearch: true, fetchImpl: noFetch }), /capacidade/);
	await assert.rejects(requestCompletion({ apiKey: 'k', gateway: { apiMode: 'chat-completions', webSearchCapable: true }, systemPrompt: '', userContext: '', webSearch: true, fetchImpl: noFetch }), /Responses API/);
});
