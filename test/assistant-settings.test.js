'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeGateway, normalizeProfiles, resolveApiKey, selectionKey } = require('../src/assistant-settings');

test('normaliza gateway sem perder campos globais', () => {
	assert.deepEqual(normalizeGateway({ name: 'Proxy', baseUrl: 'https://gateway.example/v1/', apiMode: 'chat-completions', model: 'modelo', webSearchCapable: false, extraHeaders: { 'X-Tenant': 'abc' } }), { name: 'Proxy', baseUrl: 'https://gateway.example/v1', apiMode: 'chat-completions', model: 'modelo', webSearchCapable: false, extraHeaders: { 'X-Tenant': 'abc' } });
});

test('bloqueia headers de credencial e URL insegura remota', () => {
	assert.throws(() => normalizeGateway({ extraHeaders: { Authorization: 'outra chave' } }), /não permitido/);
	assert.throws(() => normalizeGateway({ baseUrl: 'http://example.com/v1' }), /HTTPS/);
});

test('perfis rejeitam IDs duplicados após normalização', () => {
	assert.throws(() => normalizeProfiles([{ id: 'VEN-DAS', name: 'A', systemPrompt: 'x' }, { id: 'ven-das', name: 'B', systemPrompt: 'y' }]), /duplicados/);
});

test('teste de conexão prefere chave digitada sem consultar a salva', () => {
	let reads = 0;
	assert.equal(resolveApiKey(' digitada ', () => { reads++; return 'salva'; }), 'digitada');
	assert.equal(reads, 0);
	assert.equal(resolveApiKey('', () => { reads++; return 'salva'; }), 'salva');
	assert.equal(reads, 1);
});

test('seleção exige e separa accountId real da conversa', () => {
	assert.notEqual(selectionKey('conta-a', 'chat'), selectionKey('conta-b', 'chat'));
	assert.throws(() => selectionKey('', 'chat'), /obrigatórias/);
});
