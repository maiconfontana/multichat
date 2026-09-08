'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeContext, buildInput, MAX_MESSAGES } = require('../src/assistant-core');

test('normaliza e limita mensagens', () => {
	const messages = Array.from({ length: 40 }, (_, i) => ({ direction: i % 2 ? 'out' : 'in', text: ` mensagem ${i} ` }));
	const result = normalizeContext({ source: 'whatsapp', conversationId: 'chat-1', title: 'Cliente', messages });
	assert.equal(result.messages.length, MAX_MESSAGES);
	assert.equal(result.messages[0].text, 'mensagem 10');
});

test('rejeita Teams explicitamente', () => {
	assert.throws(() => normalizeContext({ source: 'teams', conversationId: 'x', messages: [{ text: 'oi' }] }), /Teams/);
});

test('monta prompt sem alterar direção', () => {
	const input = buildInput({ source: 'whatsapp', conversationId: 'x', title: 'Ana', messages: [{ direction: 'in', text: 'Olá' }] }, 'Seja breve');
	assert.match(input, /Contato: Olá/);
	assert.match(input, /Seja breve/);
});
