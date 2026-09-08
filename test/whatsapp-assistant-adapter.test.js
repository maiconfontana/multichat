'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const adapter = require('../src/whatsapp-assistant-adapter');

function identityDoc(title = 'Cliente', key = 'chat-1') {
	const titleNode = { textContent: title, getAttribute: name => name === 'title' ? title : null };
	const header = { querySelector: () => titleNode };
	const selected = { textContent: title, getAttribute: name => name === 'data-id' ? key : null };
	return { querySelector: selector => selector === '#main header' ? header : selected };
}

test('getConversationIdentity exige conversa e cria identidade estável', () => {
	assert.deepEqual(adapter.getConversationIdentity(identityDoc()), { conversationId: 'chat-1|Cliente', title: 'Cliente' });
	assert.throws(() => adapter.getConversationIdentity({ querySelector: () => null }), /Abra uma conversa/);
});

test('extractVisibleContext elimina duplicatas e ignora nós invisíveis', () => {
	const doc = identityDoc();
	const incoming = { classList: { contains: () => false }, closest: () => incoming, getBoundingClientRect: () => ({ width: 10, height: 10 }), querySelector: () => ({ innerText: ' Olá  mundo ' }) };
	const outgoing = { classList: { contains: value => value === 'message-out' }, closest: () => outgoing, getBoundingClientRect: () => ({ width: 10, height: 10 }), querySelector: () => null, textContent: 'Resposta' };
	doc.querySelectorAll = () => [incoming, incoming, outgoing];
	assert.deepEqual(adapter.extractVisibleContext(doc).messages, [{ direction: 'in', text: 'Olá mundo' }, { direction: 'out', text: 'Resposta' }]);
});

test('insertDraft não envia, valida conversa e dispara somente input', () => {
	const doc = identityDoc();
	const events = [];
	const editor = { textContent: '', focus() { this.focused = true; }, dispatchEvent(event) { events.push(event); } };
	doc.querySelector = selector => selector === '#main header' ? { querySelector: () => ({ textContent: 'Cliente', getAttribute: () => 'Cliente' }) } : selector.startsWith('#pane-side') ? { textContent: 'Cliente', getAttribute: name => name === 'data-id' ? 'chat-1' : null } : editor;
	doc.getSelection = () => ({ selectAllChildren() {}, deleteFromDocument() {} });
	const OldInputEvent = global.InputEvent;
	global.InputEvent = class { constructor(type, init) { this.type = type; Object.assign(this, init); } };
	try {
		assert.equal(adapter.insertDraft(doc, 'chat-1|Cliente', 'Rascunho'), true);
		assert.equal(editor.textContent, 'Rascunho');
		assert.deepEqual(events.map(e => e.type), ['input']);
		assert.throws(() => adapter.insertDraft(doc, 'chat-1|Cliente', 'substituir'), /Já existe um rascunho/);
		assert.throws(() => adapter.insertDraft(doc, 'outra|conversa', 'x'), /conversa mudou/i);
	} finally { global.InputEvent = OldInputEvent; }
});
