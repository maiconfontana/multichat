'use strict';

function compact(value, max = 2000) { return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max); }
function getConversationIdentity(doc) {
	const selected = doc.querySelector('#pane-side [aria-selected="true"], #pane-side [data-testid="cell-frame-container"][aria-selected="true"]');
	const header = doc.querySelector('#main header');
	const titleNode = header && header.querySelector('[title], [dir="auto"]');
	const title = compact(titleNode && (titleNode.getAttribute('title') || titleNode.textContent), 300);
	const key = compact(selected && (selected.getAttribute('data-id') || selected.getAttribute('data-testid') || selected.textContent), 500);
	if (!header || (!title && !key)) throw new Error('Abra uma conversa do WhatsApp antes de usar o assistente.');
	return { conversationId: `${key}|${title}`, title };
}
function extractVisibleContext(doc) {
	const identity = getConversationIdentity(doc);
	const nodes = [...doc.querySelectorAll('#main [data-pre-plain-text], #main .message-in, #main .message-out')];
	const seen = new Set(); const messages = [];
	for (const node of nodes) {
		const box = node.closest('.message-in, .message-out') || node;
		if (seen.has(box)) continue; seen.add(box);
		const rect = typeof box.getBoundingClientRect === 'function' ? box.getBoundingClientRect() : { width: 1, height: 1 };
		if (rect.width === 0 && rect.height === 0) continue;
		const textNode = box.querySelector('.selectable-text, [data-testid="msg-text"]') || box;
		const text = compact(textNode.innerText || textNode.textContent);
		if (text) messages.push({ direction: box.classList.contains('message-out') ? 'out' : 'in', text });
	}
	return { source: 'whatsapp', ...identity, messages: messages.slice(-30) };
}
function insertDraft(doc, expectedConversationId, draft) {
	const current = getConversationIdentity(doc);
	if (current.conversationId !== expectedConversationId) throw new Error('A conversa mudou. O rascunho não foi inserido.');
	const editor = doc.querySelector('#main footer [contenteditable="true"][role="textbox"], #main footer [contenteditable="true"]');
	if (!editor) throw new Error('Campo de mensagem do WhatsApp não encontrado.');
	const existing = compact(editor.innerText || editor.textContent, 8000);
	if (existing) throw new Error('Já existe um rascunho no WhatsApp. Limpe-o antes de inserir a sugestão.');
	editor.focus();
	const selection = doc.getSelection && doc.getSelection();
	if (selection) { selection.selectAllChildren(editor); selection.deleteFromDocument(); }
	editor.textContent = String(draft || '').slice(0, 8000);
	editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: editor.textContent }));
	return true;
}
module.exports = { compact, getConversationIdentity, extractVisibleContext, insertDraft };
