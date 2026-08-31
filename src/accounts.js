const sleep = ms => new Promise(r => setTimeout(r, ms));
const makeid = (len) => {
	let r = '';
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < len; i++)
		r += chars.charAt(Math.floor(Math.random() * chars.length));
	return r;
};

const SERVICE_ICONS = {
	whatsapp: '<svg viewBox="0 0 24 24" fill="#fff" width="24" height="24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12c3.26 0 6.262-1.296 8.516-3.404L24 24l-1.384-3.952C20.198 24 17.202 25.2 12 25.2 5.373 25.2 0 19.827 0 13.2S5.373 1.2 12 1.2c6.627 0 12 5.373 12 12 0 1.5-.28 2.937-.784 4.275l3.784 1.123L27 13.2c0-6.627-5.373-12-12-12z"/></svg>',
	teams: '<svg viewBox="0 0 24 24" fill="#fff" width="24" height="24"><path d="M17.24 13.13v6.56H7.44V3.31h8.66l5.04 5.04v9.28H17.24zM7.44 3.31h10.8l5.04 5.04v8.34h3.68v-9.6L19.24 1.93H5.27v17.76h14.3V13.13H7.44z"/></svg>',
	telegram: '<svg viewBox="0 0 24 24" fill="#fff" width="24" height="24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.617-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
	discord: '<svg viewBox="0 0 24 24" fill="#fff" width="24" height="24"><path d="M20.317 4.37a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.028C.533 9.046-.32 13.58.099 18.058a.082.082 0 00.031.056l.398.382a.07.07 0 00.071.017 19.9 19.9 0 005.993-3.09.075.075 0 00.022-.071l-.009-.042a12.7 12.7 0 00-.643-1.904.075.075 0 00-.071-.042h-.076a18.3 18.3 0 01-4.354-2.33.076.076 0 01-.011-.111 12.2 12.2 0 013.7-2.566.076.076 0 01.084.008l.019.016a14.08 14.08 0 003.632 2.251.076.076 0 00.08-.012l.016-.013a14.17 14.17 0 003.632-2.251l.018-.016a.076.076 0 01.084-.008 12.17 12.17 0 013.7 2.566.076.076 0 01-.012.11 18.27 18.27 0 01-4.354 2.33h-.076a.075.075 0 00-.071.042 12.64 12.64 0 00-.643 1.904l-.009.042a.075.075 0 00.022.071 19.87 19.87 0 005.993 3.09.07.07 0 00.071-.017l.398-.382a.077.077 0 00.031-.056c.5-5.177-.834-9.674-3.549-13.66a.061.061 0 00-.031-.028z"/></svg>',
	slack: '<svg viewBox="0 0 24 24" fill="#fff" width="24" height="24"><path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52 2.527 2.527 0 012.52 2.52zM5.042 8.752A2.528 2.528 0 012.522 11.275 2.528 2.528 0 010 8.753a2.528 2.528 0 012.522-2.52 2.528 2.528 0 012.52 2.52zM8.51 12.229a2.527 2.527 0 012.522-2.52 2.527 2.527 0 012.522 2.52 2.528 2.528 0 01-2.522 2.523 2.528 2.528 0 01-2.522-2.523zm3.513-7.418a2.527 2.527 0 012.522 2.52 2.527 2.527 0 01-2.522 2.523 2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52zm0 0v-2.522h3.513v5.043H8.51V2.52h3.513v2.29zm0 0v2.29m3.513 0v-2.29m0 0h2.522v5.043H15.54zm0 5.043a2.528 2.528 0 012.52 2.523 2.527 2.527 0 01-2.52 2.52 2.528 2.528 0 01-2.523-2.52 2.528 2.528 0 012.523-2.523zm0 5.042v2.523h-3.513v-5.044h3.513zm0 0h2.522v2.523h-5.034zm0 0h2.522m-3.513 0v2.523H5.042v-5.044H8.54v2.52zM5.042 15.165v2.52m0 0H2.52v-2.52m0 0h-2.52v-2.523h5.042zm0 0H2.52m0 0h-2.52v-2.523h5.042zm0 0H2.52m0 0h-2.52m0 0v-2.523h5.042zm0 0h2.52"/></svg>',
	custom: '<svg viewBox="0 0 24 24" fill="#fff" width="24" height="24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>'
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

const renderList = (accounts) => {
	const $list = $("#sb-list");
	$list.empty();
	$("#sb-empty").toggle(accounts.length === 0);
	$list.toggle(accounts.length > 0);

	for (const acct of accounts) {
		const unread = acct.unread || 0;
		const isActive = acct.active || (acct.id === activeId);
		const notifOn = !acct.notifications || acct.notifications.enabled !== false;
		const color = TYPE_COLORS[acct.type] || TYPE_COLORS.custom;
		const icon = SERVICE_ICONS[acct.type] || SERVICE_ICONS.custom;
		const label = TYPE_LABELS[acct.type] || 'Personalizado';

		const el = $(`
			<div class="acct-item ${isActive ? 'active' : ''}" data-id="${acct.id}">
				<div class="acct-avatar" style="background:${color}">${icon}<span class="acct-unread-badge ${unread > 0 ? 'show' : ''}" data-unread-badge="${acct.id}">${unread > 99 ? '99+' : unread}</span></div>
				<div class="acct-meta">
					<div class="acct-name" title="${acct.name}">${acct.name}</div>
					<div class="acct-sub">
						<span title="${label}">${label}</span>
						${notifOn ? '' : '<span class="notif-off">🔕</span>'}
					</div>
				</div>
				<span class="acct-unread ${unread > 0 ? 'show' : ''}" data-unread="${acct.id}">${unread > 99 ? '99+' : unread}</span>
				<div class="acct-actions">
					<button type="button" class="acct-notif" title="Notificações ${notifOn ? 'on' : 'off'}" data-id="${acct.id}" data-enabled="${notifOn}">
						<i class="bi ${notifOn ? 'bi-bell-fill' : 'bi-bell-slash-fill'}"></i>
					</button>
					<button type="button" class="acct-edit" title="Editar" data-id="${acct.id}" data-name="${acct.name}" data-type="${acct.type}" data-url="${acct.url || ''}" data-notif="${notifOn}"><i class="bi bi-pencil"></i></button>
					<button type="button" class="acct-del" title="Remover" data-id="${acct.id}" data-name="${acct.name}"><i class="bi bi-person-x"></i></button>
				</div>
			</div>
		`);

		el.on("click", (e) => {
			if ($(e.target).closest(".acct-actions").length) return;
			if (acct.id !== activeId) window.electron.gotoAccount(acct.id);
		});

		el.find(".acct-notif").on("click", (e) => {
			e.stopPropagation();
			const enabled = $(e.currentTarget).data("enabled") === true;
			window.electron.toggleNotifications(acct.id, !enabled);
		});

		el.find(".acct-edit").on("click", (e) => {
			e.stopPropagation();
			const btn = e.currentTarget;
			$("#acct-action").val("edit");
			$("#acct-id").val(btn.dataset.id);
			$("#acct-name").val(btn.dataset.name);
			$("#acct-type").val(btn.dataset.type || "custom");
			$("#acct-url").val(btn.dataset.url || "");
			$("#acct-notif-switch").prop("checked", btn.dataset.notif === "true");
			updateUrlVisibility(btn.dataset.type || "custom");
			$("#accountModalLabel").html("Editar conta");
			$("#accountModal").modal("show");
			$("#acct-name").focus().select();
		});

		el.find(".acct-del").on("click", (e) => {
			e.stopPropagation();
			$("#acct-account-remove-name").text(acct.name);
			$("#acct-delete-button").attr("data-acct-id", acct.id);
			$("#deleteModal").modal("show");
		});

		$list.append(el);
	}
};

const updateUrlVisibility = (type) => {
	if (type === "custom") {
		$("#url-group").slideDown(150);
		$("#acct-url").prop("required", true);
	} else {
		$("#url-group").slideUp(150);
		$("#acct-url").prop("required", false);
	}
};

$("#acct-type").on("change", function () {
	updateUrlVisibility(this.value);
});

const updateUnreadUI = (id, unread) => {
	const badge = $(`[data-unread="${id}"]`);
	if (badge.length) {
		badge.text(unread > 99 ? '99+' : unread);
		badge.toggleClass("show", unread > 0);
	}
	const badgeAvatar = $(`[data-unread-badge="${id}"]`);
	if (badgeAvatar.length) {
		badgeAvatar.text(unread > 99 ? '99+' : unread);
		badgeAvatar.toggleClass("show", unread > 0);
	}
};

const setActiveUI = (id) => {
	activeId = id;
	$(".acct-item").removeClass("active");
	$(`.acct-item[data-id="${id}"]`).addClass("active");
	const el = $(`.acct-item[data-id="${id}"]`)[0];
	if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
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

// Recolhe/expande a sidebar (o main ajusta a largura)
const setCollapsedUI = (collapsed) => {
	$("body").toggleClass("collapsed", !!collapsed);
	$("#btn-toggle-sidebar i").attr("class", collapsed ? "bi bi-list" : "bi bi-sidebar");
	$("#btn-toggle-sidebar").attr("title", collapsed ? "Expandir sidebar" : "Recolher sidebar");
};

init();

// Botão de recolher/expandir sidebar
$("#btn-toggle-sidebar").on("click", () => {
	window.electron.toggleSidebar();
});

// Botão Adicionar (+)
$("#btn-add").on("click", () => {
	$("#acct-action").val("new");
	$("#acct-id").val("");
	$("#acct-name").val("");
	$("#acct-type").val("whatsapp");
	$("#acct-url").val("");
	$("#acct-notif-switch").prop("checked", true);
	updateUrlVisibility("whatsapp");
	$("#accountModalLabel").html("Nova conta / mensageiro");
	$("#accountModal").modal("show");
	$("#acct-name").focus();
});

// Salvar (OK / Form Submit)
$("#accountModal").find(".acct-save").on("click", () => {
	const name = $("#acct-name").val().trim();
	const type = $("#acct-type").val();
	const url = $("#acct-url").val().trim();
	const notifEnabled = $("#acct-notif-switch").is(":checked");

	if (!name) { $(".invalid-feedback").show(); return; }
	if (type === "custom" && !url) { alert("Por favor informe a URL para o serviço personalizado."); return; }
	$(".invalid-feedback").hide();

	if ($("#acct-action").val() === "new") {
		window.electron.addAccount({
			id: makeid(10),
			name: name,
			type: type,
			url: type === "custom" ? url : undefined,
			notifications: { enabled: notifEnabled }
		});
	} else {
		window.electron.updateAccount({
			id: $("#acct-id").val(),
			name: name,
			type: type,
			url: type === "custom" ? url : undefined,
			notifications: { enabled: notifEnabled }
		});
	}

	bootstrap.Modal.getInstance("#accountModal").hide();
});

$("#acct-name, #acct-url").on("keypress", (e) => {
	if (e.key === "Enter") $(".acct-save").click();
});

$("#acct-delete-button").on("click", () => {
	const id = $("#acct-delete-button").attr("data-acct-id");
	bootstrap.Modal.getInstance("#deleteModal").hide();
	window.electron.deleteAccount(id);
});

// ── Screen Share (compat WhatsApp) ──
const shareScreenTemplate = `
<div class="col">
  <div class="card mx-auto my-2" style="width: 12rem;">
    <img src="@IMGDATA" class="card-img-top">
    <div class="card-body text-center">
      <input type="radio" class="btn-check" id="btn-@TYPE-@ID" name="share-id" value="@ID">
      <label class="btn btn-sm btn-outline-success" for="btn-@TYPE-@ID">@NAME</label>
    </div>
  </div>
</div>`;

const shareRadioTemplate = `
<div class="form-check">
  <input type="radio" class="form-check-input btn-radio-window" id="btn-@TYPE-@ID" name="share-id" value="@ID" wa-img-data="@IMGDATA">
  <label class="form-check-label" for="btn-@TYPE-@ID">@NAME</label>
</div>`;

window.showScreenShareModal = (viewid) => {
	$("#share-screens").empty();
	$("#share-windows-radios").empty();

	window.electron.getShareSources().then((sources) => {
		for (const src of sources) {
			if (src.id.indexOf("screen") !== -1)
				$("#share-screens").append(
					shareScreenTemplate
						.replace(/@TYPE/g, "screen").replace(/@ID/g, src.id)
						.replace(/@NAME/g, src.name).replace(/@IMGDATA/g, src.thumb)
				);
			if (src.id.indexOf("window") !== -1)
				$("#share-windows-radios").append(
					shareRadioTemplate
						.replace(/@TYPE/g, "window").replace(/@ID/g, src.id)
						.replace(/@NAME/g, src.name).replace(/@IMGDATA/g, src.thumb)
				);
		}
		$(".btn-radio-window").off("change").on("change", function () {
			$("#share-windows-thumb").attr("src", $(this).attr("wa-img-data"));
		});
	});

	const screenShareModal = new bootstrap.Modal("#screenShareModal");
	screenShareModal.show();
};

$("#btn-share-ok").on("click", () => {
	const shareid = $('input[name=share-id]:checked').val();
	if (shareid) {
		bootstrap.Modal.getInstance("#screenShareModal").hide();
		window.electron.setShareSelected(shareid);
	}
});

$("#btn-share-cancel").on("click", () => {
	bootstrap.Modal.getInstance("#screenShareModal").hide();
	window.electron.setShareCancelled();
});
