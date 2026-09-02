const sleep = ms => new Promise(r => setTimeout(r, ms));
const makeid = (len) => {
	let r = '';
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < len; i++)
		r += chars.charAt(Math.floor(Math.random() * chars.length));
	return r;
};

// Ícones de marca oficiais (Simple Icons, viewBox 0 0 24 24)
const SERVICE_ICONS = {
	whatsapp: '<svg viewBox="0 0 24 24" fill="#fff" width="24" height="24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>',
	teams: '<svg viewBox="0 0 16 16" fill="#fff" width="24" height="24"><path d="M9.186 4.797a2.42 2.42 0 1 0-2.86-2.448h1.178c.929 0 1.682.753 1.682 1.682v.766Zm-4.295 7.738h2.613c.929 0 1.682-.753 1.682-1.682V5.58h2.783a.7.7 0 0 1 .682.716v4.294a4.197 4.197 0 0 1-4.093 4.293c-1.618-.04-3-.99-3.667-2.35Zm10.737-9.372a1.674 1.674 0 1 1-3.349 0 1.674 1.674 0 0 1 3.349 0Zm-2.238 9.488c-.04 0-.08 0-.12-.002a5.19 5.19 0 0 0 .381-2.07V6.306a1.692 1.692 0 0 0-.15-.725h1.792c.39 0 .707.317.707.707v3.765a2.598 2.598 0 0 1-2.598 2.598h-.013Z"/><path d="M.682 3.349h6.822c.377 0 .682.305.682.682v6.822a.682.682 0 0 1-.682.682H.682A.682.682 0 0 1 0 10.853V4.03c0-.377.305-.682.682-.682Zm5.206 2.596v-.72h-3.59v.72h1.357V9.66h.87V5.945h1.363Z"/></svg>',
	telegram: '<svg viewBox="0 0 24 24" fill="#fff" width="24" height="24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
	discord: '<svg viewBox="0 0 24 24" fill="#fff" width="24" height="24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>',
	slack: '<svg viewBox="0 0 24 24" fill="#fff" width="24" height="24"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>',
	custom: '<svg viewBox="0 0 16 16" fill="#fff" width="24" height="24"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855-.143.268-.276.56-.395.872.705.157 1.472.257 2.282.287V1.077zM4.249 3.539c.142-.384.304-.744.481-1.078a6.7 6.7 0 0 1 .597-.933A7.01 7.01 0 0 0 3.051 3.05c.362.184.763.349 1.198.49zM3.509 7.5c.036-1.07.188-2.087.436-3.008a9.124 9.124 0 0 1-1.565-.667A6.964 6.964 0 0 0 1.018 7.5h2.49zm1.4-2.741a12.344 12.344 0 0 0-.4 2.741H7.5V5.091c-.91-.03-1.783-.145-2.591-.332zM8.5 5.09V7.5h2.99a12.342 12.342 0 0 0-.399-2.741c-.808.187-1.681.301-2.591.332zM4.51 8.5c.035.987.176 1.914.399 2.741A13.612 13.612 0 0 1 7.5 10.91V8.5H4.51zm3.99 0v2.409c.91.03 1.783.145 2.591.332.223-.827.364-1.754.4-2.741H8.5zm-3.282 3.696c.12.312.252.604.395.872.552 1.035 1.218 1.65 1.887 1.855V11.91c-.81.03-1.577.13-2.282.287zm.11 2.276a6.696 6.696 0 0 1-.598-.933 8.853 8.853 0 0 1-.481-1.079 8.38 8.38 0 0 0-1.198.49 7.01 7.01 0 0 0 2.276 1.522zm-1.383-2.964A13.36 13.36 0 0 1 3.508 8.5h-2.49a6.963 6.963 0 0 0 1.362 3.675c.47-.258.995-.482 1.565-.667zm6.728 2.964a7.009 7.009 0 0 0 2.275-1.521 8.376 8.376 0 0 0-1.197-.49 8.853 8.853 0 0 1-.481 1.078 6.688 6.688 0 0 1-.597.933zM8.5 11.909v3.014c.67-.204 1.335-.82 1.887-1.855.143-.268.276-.56.395-.872A12.63 12.63 0 0 0 8.5 11.91zm3.555-.401c.57.185 1.095.409 1.565.667A6.963 6.963 0 0 0 14.982 8.5h-2.49a13.36 13.36 0 0 1-.437 3.008zM14.982 7.5a6.963 6.963 0 0 0-1.362-3.675c-.47.258-.995.482-1.565.667.248.92.4 1.938.437 3.008h2.49zM11.27 2.461c.177.334.339.694.482 1.078a8.368 8.368 0 0 0 1.196-.49 7.01 7.01 0 0 0-2.275-1.52c.218.283.418.597.597.932zm-.488 1.343a7.765 7.765 0 0 0-.395-.872C9.835 1.897 9.17 1.282 8.5 1.077V4.09c.81-.03 1.577-.13 2.282-.287z"/></svg>',
};

const TYPE_COLORS = {
	whatsapp: '#25d366', teams: '#5059c9', telegram: '#2aabee',
	discord: '#5865f2', slack: '#4a154b', custom: '#00a884'
};

const TYPE_LABELS = {
	whatsapp: 'WhatsApp', teams: 'Teams', telegram: 'Telegram',
	discord: 'Discord', slack: 'Slack', custom: 'Personalizado'
};

let activeId = null;
const DRAG_THRESHOLD = 6;
let drag = null;
let suppressClick = false;

const accountIds = () => $$(".acct-item").map(el => el.dataset.id);

const persistOrder = (fromIds) => {
	const ids = accountIds();
	if (ids.length < 2) return;
	if (fromIds && fromIds.join("\0") === ids.join("\0")) return;
	window.electron.reorderAccounts(ids);
};

const moveDraggedTo = (clientY) => {
	const list = $("#sb-list");
	const dragged = drag.el;
	const others = $$(".acct-item").filter(el => el !== dragged);
	for (const item of others) {
		const rect = item.getBoundingClientRect();
		if (clientY < rect.top + rect.height / 2) {
			if (dragged.nextElementSibling !== item)
				list.insertBefore(dragged, item);
			return;
		}
	}
	if (others.length)
		list.appendChild(dragged);
};

const endDrag = () => {
	if (!drag) return;
	if (drag.dragging) {
		suppressClick = true;
		drag.el.classList.remove("is-dragging");
		persistOrder(drag.fromIds);
		setTimeout(() => { suppressClick = false; }, 50);
	}
	drag = null;
};

// ── Helpers (sem jQuery) ──
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const ACCOUNT_TEMPLATE = `
	<div class="acct-avatar-wrap">
		<div class="acct-avatar" style="background:__COLOR__">__ICON__</div>
		<span class="acct-unread-badge" data-unread-badge="__ID__"></span>
	</div>
	<div class="acct-meta">
		<div class="acct-name" title="__NAME__">__NAME__</div>
		<div class="acct-sub">
			<span title="__LABEL__">__LABEL__</span>
			__NOTIF__
		</div>
	</div>
	<span class="acct-unread" data-unread="__ID__"></span>
	<div class="acct-actions">
		<button type="button" class="acct-notif" title="__NOTIF_TITLE__" data-id="__ID__">
			<i class="bi __NOTIF_ICON__"></i>
		</button>
		<button type="button" class="acct-edit" title="Editar"><i class="bi bi-pencil"></i></button>
		<button type="button" class="acct-del" title="Remover"><i class="bi bi-person-x"></i></button>
	</div>`;

const fmtUnread = (n) => n > 99 ? '99+' : String(n);

const renderList = (accounts) => {
	if (drag) {
		drag.el.classList.remove("is-dragging");
		drag = null;
	}
	const list = $("#sb-list");
	list.innerHTML = "";
	$("#sb-empty").style.display = accounts.length === 0 ? "block" : "none";
	list.style.display = accounts.length > 0 ? "block" : "none";

	for (const acct of accounts) {
		const unread = acct.unread || 0;
		const isActive = acct.active || (acct.id === activeId);
		const notifOn = !acct.notifications || acct.notifications.enabled !== false;
		const color = TYPE_COLORS[acct.type] || TYPE_COLORS.custom;
		const icon = SERVICE_ICONS[acct.type] || SERVICE_ICONS.custom;
		const label = TYPE_LABELS[acct.type] || 'Personalizado';

		const el = document.createElement("div");
		el.className = "acct-item" + (isActive ? " active" : "");
		el.dataset.id = acct.id;
		el.innerHTML = ACCOUNT_TEMPLATE
			.replace(/__COLOR__/g, color)
			.replace(/__ICON__/g, icon)
			.replace(/__ID__/g, esc(acct.id))
			.replace(/__NAME__/g, esc(acct.name))
			.replace(/__LABEL__/g, esc(label))
			.replace(/__NOTIF__/g, notifOn ? '' : '<i class="bi bi-bell-slash notif-off" title="Notificações desligadas"></i>')
			.replace(/__NOTIF_TITLE__/g, notifOn ? 'Desligar notificações' : 'Ligar notificações')
			.replace(/__NOTIF_ICON__/g, notifOn ? 'bi-bell-fill' : 'bi-bell-slash-fill');

		const badge = el.querySelector(".acct-unread-badge");
		const pill = el.querySelector(".acct-unread");
		badge.textContent = fmtUnread(unread);
		badge.classList.toggle("show", unread > 0);
		pill.textContent = fmtUnread(unread);
		pill.classList.toggle("show", unread > 0);

		const notifBtn = el.querySelector(".acct-notif");
		notifBtn.dataset.enabled = String(notifOn);

		el.addEventListener("pointerdown", (e) => {
			if (e.button !== 0) return;
			if (e.target.closest(".acct-actions")) return;
			drag = { el, startY: e.clientY, dragging: false };
		});

		el.addEventListener("click", (e) => {
			if (e.target.closest(".acct-actions")) return;
			if (suppressClick) { suppressClick = false; return; }
			if (acct.id !== activeId) window.electron.gotoAccount(acct.id);
		});

		notifBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			const enabled = e.currentTarget.dataset.enabled === "true";
			window.electron.toggleNotifications(acct.id, !enabled);
		});

		el.querySelector(".acct-edit").addEventListener("click", (e) => {
			e.stopPropagation();
			$("#acct-action").value = "edit";
			$("#acct-id").value = acct.id;
			$("#acct-name").value = acct.name;
			$("#acct-type").value = acct.type || "custom";
			$("#acct-url").value = acct.url || "";
			$("#acct-notif-switch").checked = notifOn;
			updateUrlVisibility(acct.type || "custom");
			$("#accountModalLabel").textContent = "Editar conta";
			bootstrap.Modal.getOrCreateInstance("#accountModal").show();
			$("#acct-name").focus();
			$("#acct-name").select();
		});

		el.querySelector(".acct-del").addEventListener("click", (e) => {
			e.stopPropagation();
			$("#acct-account-remove-name").textContent = acct.name;
			$("#acct-delete-button").dataset.acctId = acct.id;
			bootstrap.Modal.getOrCreateInstance("#deleteModal").show();
		});

		list.appendChild(el);
	}
};

const updateUrlVisibility = (type) => {
	const grp = $("#url-group");
	const input = $("#acct-url");
	if (type === "custom") {
		grp.style.display = "block";
		input.required = true;
	} else {
		grp.style.display = "none";
		input.required = false;
	}
};

$("#acct-type").addEventListener("change", function () {
	updateUrlVisibility(this.value);
});

const updateUnreadUI = (id, unread) => {
	for (const badge of $$(`[data-unread="${CSS.escape(id)}"], [data-unread-badge="${CSS.escape(id)}"]`)) {
		badge.textContent = fmtUnread(unread);
		badge.classList.toggle("show", unread > 0);
	}
};

const setActiveUI = (id) => {
	activeId = id;
	$$(".acct-item").forEach(el => el.classList.toggle("active", el.dataset.id === id));
	const el = $(`.acct-item[data-id="${CSS.escape(id)}"]`);
	if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
};

const setCollapsedUI = (collapsed) => {
	document.body.classList.toggle("collapsed", !!collapsed);
	$("#btn-toggle-sidebar i").className = collapsed ? "bi bi-list" : "bi bi-layout-sidebar";
	$("#btn-toggle-sidebar").title = collapsed ? "Expandir sidebar" : "Recolher sidebar";
};

const init = async () => {
	while (window.electron == undefined) await sleep(1);

	window.electron.getAccounts().then(renderList);

	window.electron.reloadAccounts(() => {
		window.electron.getAccounts().then(renderList);
	});

	window.electron.onUpdateUnread((event, data) => {
		updateUnreadUI(data.id, data.unread);
	});

	window.electron.onActiveAccount((id) => {
		setActiveUI(id);
	});

	window.electron.onSidebarState(setCollapsedUI);
};

init();

document.addEventListener("pointermove", (e) => {
	if (!drag) return;
	if (!drag.dragging && Math.abs(e.clientY - drag.startY) < DRAG_THRESHOLD) return;
	if ($$(".acct-item").length < 2) return;
	if (!drag.dragging) {
		drag.dragging = true;
		drag.fromIds = accountIds();
		drag.el.classList.add("is-dragging");
		try { drag.el.setPointerCapture(e.pointerId); } catch (_) {}
	}
	moveDraggedTo(e.clientY);
});

document.addEventListener("pointerup", endDrag);
document.addEventListener("pointercancel", endDrag);

// Botão de recolher/expandir sidebar
$("#btn-toggle-sidebar").addEventListener("click", () => {
	window.electron.toggleSidebar();
});

// Botão Adicionar (+) — expande a sidebar se estiver recolhida, para o modal caber
$("#btn-add").addEventListener("click", () => {
	if (document.body.classList.contains("collapsed"))
		window.electron.toggleSidebar();
	$("#acct-action").value = "new";
	$("#acct-id").value = "";
	$("#acct-name").value = "";
	$("#acct-type").value = "whatsapp";
	$("#acct-url").value = "";
	$("#acct-notif-switch").checked = true;
	updateUrlVisibility("whatsapp");
	$("#accountModalLabel").textContent = "Nova conta / mensageiro";
	bootstrap.Modal.getOrCreateInstance("#accountModal").show();
	$("#acct-name").focus();
});

// Salvar
const saveAccount = () => {
	const name = $("#acct-name").value.trim();
	const type = $("#acct-type").value;
	const url = $("#acct-url").value.trim();
	const notifEnabled = $("#acct-notif-switch").checked;

	if (!name) { $(".invalid-feedback").style.display = "block"; return; }
	if (type === "custom" && !url) { alert("Por favor informe a URL para o serviço personalizado."); return; }
	$(".invalid-feedback").style.display = "none";

	if ($("#acct-action").value === "new") {
		window.electron.addAccount({
			id: makeid(10),
			name: name,
			type: type,
			url: type === "custom" ? url : undefined,
			notifications: { enabled: notifEnabled }
		});
	} else {
		window.electron.updateAccount({
			id: $("#acct-id").value,
			name: name,
			type: type,
			url: type === "custom" ? url : undefined,
			notifications: { enabled: notifEnabled }
		});
	}

	bootstrap.Modal.getInstance("#accountModal").hide();
};

$("#accountModal").querySelector(".acct-save").addEventListener("click", saveAccount);

$("#acct-name").addEventListener("keypress", (e) => { if (e.key === "Enter") saveAccount(); });
$("#acct-url").addEventListener("keypress", (e) => { if (e.key === "Enter") saveAccount(); });

$("#acct-delete-button").addEventListener("click", () => {
	const id = $("#acct-delete-button").dataset.acctId;
	bootstrap.Modal.getInstance("#deleteModal").hide();
	window.electron.deleteAccount(id);
});
