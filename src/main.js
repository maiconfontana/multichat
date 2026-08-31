const { app, BrowserWindow, WebContentsView, ipcMain, Menu, Tray, nativeImage, Notification, desktopCapturer, session, shell } = require('electron');
const Store = require('electron-store').default;
const path  = require('node:path');
const fs    = require('node:fs');

// Constantes serializáveis para enviar aos renderers via IPC (sem funções,
// que não atravessam a ponte — ver initResources / init*Instance).
const ConstantsForIPC = () => JSON.parse(JSON.stringify(Constants));

if (!app.requestSingleInstanceLock()) {
	app.quit();
	process.exit(0);
}

for (const arg of process.argv) {
	if (arg.startsWith("--disable-gpu")) {
		console.log("MultiChat: Disabling GPU by --disable-gpu argument");
		app.disableHardwareAcceleration();
		app.commandLine.appendSwitch('disable-gpu');
		app.commandLine.appendSwitch('disable-gpu-compositing');
	}
}

// Tempo de inatividade antes de suspender (descarregar da RAM) uma conta
// que não está em exibição. O login fica salvo (sessão persistente) e a
// conta recarrega automaticamente ao ser selecionada de novo.
const SUSPEND_AFTER_MS = 10 * 60 * 1000;
const BOUNDS_DEBOUNCE_MS = 150;

class MultiChatApp {
	constructor() {
		this.store      = new Store();
		this.baseIcon   = path.join(__dirname, "../assets/icon.png");
		this.trayIcon   = path.join(__dirname, "../assets/icon-32.png");
		this.isQuit     = false;
		this.spellLangs = ["en-US", "pt-BR"];
		this.activeId   = null;
		this.shareCurrent = null;
		this.sharePicker = null;
		this.sidebarCollapsed = this.store.get("sidebarCollapsed");
		if (this.sidebarCollapsed === undefined) {
			this.sidebarCollapsed = true; // padrão: sidebar recolhida (só ícones)
			this.store.set("sidebarCollapsed", true);
		}
		this._boundsTimer = null;

		this.bounds = this.store.get("bounds");
		if (this.bounds == undefined) {
			this.bounds = { width: 1024, height: 768, x: null, y: null };
			this.store.set("bounds", this.bounds);
		}

		this.accounts  = this.store.get("accounts");
		this.instances = {};
		if (this.accounts == undefined) {
			this.accounts = [{ id: "default", name: "Default Account" }];
			this.store.set("accounts", this.accounts);
		}

		const quitItem = { label: "Encerrar", click: () => { this.isQuit = true; app.quit(); } };

		const appMenu = [];
		if (process.platform === "darwin") {
			appMenu.push({
				label: "MultiChat",
				submenu: [
					{ role: "about" },
					{ type: "separator" },
					{ role: "services" },
					{ type: "separator" },
					{ role: "hide" },
					{ role: "hideOthers" },
					{ role: "unhide" },
					{ type: "separator" },
					quitItem
				]
			});
		}

		this.menuTemplate = [
			...appMenu,
			{
				label: "Conta",
				submenu: [
					{ label: "Recarregar conta atual", accelerator: "CmdOrCtrl+R", click: () => { this.reloadCurrentView(); } },
					{ label: "Próxima conta", accelerator: "CmdOrCtrl+Tab", click: () => { this.cycleAccount(1); } },
					{ label: "Conta anterior", accelerator: "CmdOrCtrl+Shift+Tab", click: () => { this.cycleAccount(-1); } },
					{ type: "separator" },
					{ label: "Ferramentas de desenvolvedor", accelerator: "CmdOrCtrl+Shift+I", click: () => { this.openDevTools(); } },
					{ type: "separator" },
					quitItem
				]
			},
			{
				label: "Exibir",
				submenu: [
					{ role: "resetZoom", label: "Zoom padrão" },
					{ role: "zoomIn",  label: "Ampliar" },
					{ role: "zoomOut", label: "Reduzir" },
					{ type: "separator" },
					{ role: "togglefullscreen", label: "Tela cheia" },
					{ type: "separator" },
					{ label: this.sidebarCollapsed ? "Expandir barra lateral" : "Recolher barra lateral", click: () => { this.toggleSidebar(); } }
				]
			},
			{
				label: "Ajuda",
				submenu: [
					{ label: "Version undefined by me", enabled: false },
					{ type: "separator" },
					quitItem
				]
			}
		];
	}

	_initElectronApp() {
		app.userAgentFallback = Constants.whatsapp.userAgent;
		if (process.platform == "win32")
			app.setAppUserModelId(Constants.appId);
	}

	init() {
		this._initElectronApp();

		let langs = [];
		for (const arg of process.argv) {
			if (arg.startsWith("--spell-lang"))
				langs.push(arg.split("=")[1]);
		}
		if (langs.length > 0)
			this.spellLangs = langs;
		console.log(`MultiChat: Spell Check: ${this.spellLangs}`);

		this.registerEvents();
		this.createWindow();
		this.createSidebarView();

		// Lazy-load: apenas a primeira conta é carregada no início.
		// As demais são criadas quando selecionadas pela primeira vez e
		// suspensas (descarregadas) após um período sem uso (ver suspendAccount).
		if (this.accounts.length > 0)
			this.setCurrentView(this.accounts[0].id);

		this.menuTemplate[this.menuTemplate.length - 1].submenu[0].label =
			`Versão ${Constants.version} (Electron@${process.versions.electron})`;
		this.menu = Menu.buildFromTemplate(this.menuTemplate);
		Menu.setApplicationMenu(this.menu);

		const trayMenu = Menu.buildFromTemplate([
			{ label: "Mostrar/ocultar", click: () => { this.showHide(); } },
			{ type: "separator" },
			{ label: "Encerrar", click: () => { this.isQuit = true; app.quit(); } }
		]);
		const trayImg = fs.existsSync(this.trayIcon)
			? nativeImage.createFromPath(this.trayIcon)
			: nativeImage.createFromPath(this.baseIcon);
		this.tray = new Tray(trayImg);
		this.tray.setContextMenu(trayMenu);
		this.tray.setToolTip(Constants.appName);
		this.tray.on("click", () => { this.showHide(); });

		this.activeNotifications = [];
	}

	registerEvents() {
		ipcMain.on(Constants.event.newRendererNotification, (event, data) => {
			const inst = this.instances[data.id];
			if (!inst) return;

			// Per-account notification setting
			const notifEnabled = inst.notifications === undefined ? true : inst.notifications.enabled;
			if (!notifEnabled) return;

			const acctName = inst.name;
			const n = new Notification({
				title: `[${acctName}] :: ${data.title}`,
				body: data.options.body,
				...(data.icon ? { icon: nativeImage.createFromDataURL(data.icon) } : {}),
				urgency: "normal"
			});
			n.on("click", () => {
				this.showHide(false);
				this.setCurrentView(data.id);
				if (this.instances[data.id] && this.instances[data.id].view)
					this.instances[data.id].view.webContents.send(Constants.event.fireNotificationClick, data.options.tag);
				this.activeNotifications = this.activeNotifications.filter(_n => _n !== n);
			});
			n.on("close", () => {
				this.activeNotifications = this.activeNotifications.filter(_n => _n !== n);
			});
			this.activeNotifications.push(n);
			n.show();
		});

		ipcMain.on(Constants.event.updateBadgeIcon, (event, dataURL) => {
			if (!this.tray) return;
			this.tray.setImage(nativeImage.createFromDataURL(dataURL));
		});

		ipcMain.on(Constants.event.updateUnreadMessages, (event, data) => {
			if (this.instances[data.id]) {
				this.instances[data.id].unread = data.unread;
				this.updateTrayBadgeCounter();
			}
			if (this.sidebarView)
				this.sidebarView.webContents.send(Constants.event.updateUnread, data);
		});

		ipcMain.handle(Constants.event.getAccountsList, () => {
			return this.accounts.map(a => ({
				id: a.id,
				name: a.name,
				type: a.type || "whatsapp",
				url: a.url || (Constants.services[a.type || "whatsapp"] ? Constants.services[a.type || "whatsapp"].url : Constants.whatsapp.url),
				notifications: a.notifications || { enabled: true },
				unread: this.instances[a.id] ? this.instances[a.id].unread : 0,
				active: this.activeId === a.id
			}));
		});

		ipcMain.on(Constants.event.addAccount, (event, data) => {
			const svc = Constants.services[data.type] || Constants.services.whatsapp;
			const account = {
				id: data.id,
				name: data.name,
				type: data.type || "whatsapp",
				url: data.url || svc.url,
				notifications: { enabled: data.notifications !== false }
			};
			this.accounts.push(account);
			this.store.set("accounts", this.accounts);
			// A view é criada por setCurrentView (lazy), não aqui.
			this.sidebarView.webContents.send(Constants.event.reloadAccounts);
			this.setCurrentView(account.id);
		});

		ipcMain.on(Constants.event.updateAccount, (event, data) => {
			for (let i = 0; i < this.accounts.length; i++) {
				if (this.accounts[i].id == data.id) {
					this.accounts[i].name = data.name;
					if (data.type != undefined) this.accounts[i].type = data.type;
					if (data.url != undefined) this.accounts[i].url = data.url;
					if (data.notifications != undefined) this.accounts[i].notifications = data.notifications;
					break;
				}
			}
			this.store.set("accounts", this.accounts);
			if (this.instances[data.id]) {
				this.instances[data.id].name = data.name;
				if (data.notifications != undefined)
					this.instances[data.id].notifications = data.notifications;
			}
			this.sidebarView.webContents.send(Constants.event.reloadAccounts);
		});

		ipcMain.on(Constants.event.deleteAccount, (event, id) => {
			if (this.accounts.length <= 1) return;

			let toDelete = -1;
			for (let idx = 0; idx < this.accounts.length; idx++) {
				if (this.accounts[idx].id == id) { toDelete = idx; break; }
			}
			if (toDelete == -1) return; // id inválido: não remover a última conta por engano

			this.accounts.splice(toDelete, 1);
			this.store.set("accounts", this.accounts);

			if (this.instances[id]) {
				this.clearSuspendTimer(id);
				if (this.instances[id].view) {
					this.window.contentView.removeChildView(this.instances[id].view);
					try { this.instances[id].view.webContents.close(); } catch (e) {}
				}
				delete this.instances[id];
			}

			const ses = session.fromPartition(`persist:${id}`);
			ses.clearStorageData().then(() => {
				const dir = ses.getStoragePath();
				if (dir) fs.rmSync(dir, { recursive: true, force: true });
			});

			if (this.activeId == id)
				this.setCurrentView(this.accounts[0].id);

			this.sidebarView.webContents.send(Constants.event.reloadAccounts);
		});

		ipcMain.on(Constants.event.gotoAccount, (event, id) => {
			this.setCurrentView(id);
		});

		ipcMain.on(Constants.event.toggleNotifications, (event, data) => {
			const account = this.accounts.find(a => a.id === data.id);
			if (!account) return;
			account.notifications = {
				enabled: data.enabled,
				...((account.notifications || {}).body !== undefined ? { body: account.notifications.body } : {})
			};
			this.store.set("accounts", this.accounts);
			if (this.instances[data.id])
				this.instances[data.id].notifications = account.notifications;
			this.sidebarView.webContents.send(Constants.event.reloadAccounts);
		});

		ipcMain.on(Constants.event.toggleSidebar, () => {
			this.toggleSidebar();
		});

		// ── Compartilhamento de tela (modal em janela própria) ──
		ipcMain.handle(Constants.event.getShareSources, async () => {
			const sources = await desktopCapturer.getSources({
				types: ["screen", "window"],
				thumbnailSize: { width: 320, height: 180 }
			});
			return sources.map(s => ({
				id: s.id,
				name: s.name,
				thumb: s.thumbnail.toDataURL()
			}));
		});

		ipcMain.on(Constants.event.setShareSelected, (event, shareId) => {
			if (!this.shareCurrent) return;
			try { this.shareCurrent.callback({ video: { id: shareId } }); } catch (e) {}
			this.shareCurrent = null;
			this.closeSharePicker();
		});

		ipcMain.on(Constants.event.setShareCancelled, () => {
			if (!this.shareCurrent) return;
			try { this.shareCurrent.callback(null); } catch (e) {}
			this.shareCurrent = null;
			this.closeSharePicker();
		});

		// ── Limpar ServiceWorkers/cache e recarregar (anti "atualize o Chrome") ──
		ipcMain.on(Constants.event.clearWorkersAndReload, (event, id) => {
			const inst = this.instances[id];
			if (!inst || !inst.view) return;
			console.log(`Clearing workers and reloading account "${inst.name}" (${id})...`);
			const ses = inst.view.webContents.session;
			ses.clearStorageData({
				storages: ["serviceworkers", "cachestorage"]
			}).then(() => {
				if (inst.view) inst.view.webContents.reload();
			}).catch(() => {
				if (inst.view) inst.view.webContents.reload();
			});
		});
	}

	toggleSidebar() {
		this.sidebarCollapsed = !this.sidebarCollapsed;
		this.store.set("sidebarCollapsed", this.sidebarCollapsed);
		this.updateSidebarBounds();
		for (const id in this.instances)
			this.layoutAccountView(id);
		// Atualiza o label do item de menu correspondente
		const viewMenu = this.menuTemplate.find(m => m.label === "Exibir");
		if (viewMenu) {
			for (const item of viewMenu.submenu) {
				if (item.label === "Expandir barra lateral" || item.label === "Recolher barra lateral") {
					item.label = this.sidebarCollapsed ? "Expandir barra lateral" : "Recolher barra lateral";
					break;
				}
			}
		}
		if (this.menu) Menu.setApplicationMenu(Menu.buildFromTemplate(this.menuTemplate));
	}

	createWindow() {
		const options = {
			width: this.bounds.width,
			height: this.bounds.height,
			icon: this.baseIcon,
			backgroundColor: "#111b21", // pintura inicial escura — evita flash branco
			// Mostra de imediato: esta janela não carrega página própria (as views
			// são filhas), então ready-to-show nunca dispararia e a janela ficaria
			// invisível. O backgroundColor cuida do flash inicial.
			show: !process.argv.includes("--start-in-tray")
		};
		if (this.bounds.x != null) {
			options.x = this.bounds.x;
			options.y = this.bounds.y;
		}

		this.window = new BrowserWindow(options);

		if (this.bounds.x == null)
			this.window.center();

		this.window.on("move", () => { this.scheduleStoreBounds(); });
		this.window.on("resize", () => { this.scheduleStoreBounds(); });
		this.window.on("close", (e) => {
			if (this.isQuit) { app.quit(); return; }
			e.preventDefault();
			this.window.hide();
		});
	}

	createSidebarView() {
		this.sidebarView = new WebContentsView({
			webPreferences: {
				preload: path.join(__dirname, "preload.js"),
				contextIsolation: true,
				nodeIntegration: false
			}
		});
		this.sidebarView.setBackgroundColor('#111b21');
		this.sidebarView.webContents.loadFile(path.join(__dirname, "accounts.html"));
		// Envio imediato (cobre o caso do listener já registrado)…
		this.sidebarView.webContents.send(Constants.event.initResources, { constants: ConstantsForIPC() });
		// …e reenvio quando a página terminar de carregar, para vencer a race
		// "evento chega antes do preload existir". O preload é idempotente.
		this.sidebarView.webContents.on("did-finish-load", () => {
			this.sidebarView.webContents.send(Constants.event.initResources, { constants: ConstantsForIPC() });
		});

		// Sidebar is always first (z-order: bottom)
		this.window.contentView.addChildView(this.sidebarView);
		this.updateSidebarBounds();

		// When sidebar finishes loading, notify it of the active account
		this.sidebarView.webContents.on("did-finish-load", () => {
			this.sidebarView.webContents.send(Constants.event.activeAccount, this.activeId);
			this.sidebarView.webContents.send(Constants.event.reloadAccounts);
			this.sidebarView.webContents.send(Constants.event.sidebarState, this.sidebarCollapsed);
		});
	}

	createAccountView(account) {
		const id = account.id;
		if (this.instances[id] && this.instances[id].view)
			return this.instances[id].view; // já criada

		const name = account.name;
		const type = account.type || "whatsapp";
		const url  = account.url || (Constants.services[type] ? Constants.services[type].url : Constants.whatsapp.url);
		const preloadFile = Constants.services[type] ? Constants.services[type].preload : "whatsapp-preload.js";

		console.log(`Creating account view for "${name} (${id})" [${type}]`);
		if (!this.instances[id]) {
			this.instances[id] = {
				id, name, type,
				unread: 0,
				notifications: account.notifications || { enabled: true },
				view: null,
				suspendTimer: null
			};
		}

		const view = new WebContentsView({
			webPreferences: {
				partition: `persist:${id}`,
				preload: path.join(__dirname, preloadFile),
				spellcheck: true,
				contextIsolation: false
			}
		});
		this.instances[id].view = view;
		this.instances[id].name = name;
		this.instances[id].type = type;

		if (this.spellLangs.length > 0)
			view.webContents.session.setSpellCheckerLanguages(this.spellLangs);

		view.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
			this.shareCurrent = { id, callback };
			this.openScreenSharePicker();
		});

		view._id   = id;
		view._name = name;
		view._type = type;
		view.setBackgroundColor('#ffffff');
		view.webContents.loadURL(url, { userAgent: Constants.whatsapp.userAgent });

		view.webContents.setWindowOpenHandler((details) => {
			// Allow the site's own windows/links, open everything else externally
			try {
				const host = new URL(details.url).hostname;
				const baseHost = new URL(url).hostname;
				if (host === baseHost || host.endsWith("." + baseHost))
					return { action: "allow" };
			} catch (e) {}
			shell.openExternal(details.url);
			return { action: 'deny' };
		});

		view.webContents.on("did-finish-load", () => {
			console.log(`Account "${name} (${id})" [${type}] loaded`);
			const initEvent = (preloadFile === "whatsapp-preload.js")
				? Constants.event.initWhatsAppInstance
				: Constants.event.initGenericInstance;
			view.webContents.send(initEvent, { id, name, constants: ConstantsForIPC() });
		});

		// Se o renderer da conta morrer, recria (mantendo a sessão persistente)
		view.webContents.on("render-process-gone", (event, details) => {
			console.warn(`Account "${name} (${id})" renderer gone: ${details.reason}`);
			const inst = this.instances[id];
			if (!inst) return;
			this.clearSuspendTimer(id);
			try { this.window.contentView.removeChildView(view); } catch (e) {}
			inst.view = null;
			if (this.activeId === id)
				this.setCurrentView(id); // recria imediatamente a conta ativa
		});

		// Start hidden — will be shown when set as current
		view.setVisible(false);
		this.window.contentView.addChildView(view);
		this.layoutAccountView(id);
		return view;
	}

	ensureAccountView(id) {
		const account = this.accounts.find(a => a.id === id);
		if (!account) return null;
		if (this.instances[id] && this.instances[id].view)
			return this.instances[id].view;
		return this.createAccountView(account);
	}

	clearSuspendTimer(id) {
		const inst = this.instances[id];
		if (inst && inst.suspendTimer) {
			clearTimeout(inst.suspendTimer);
			inst.suspendTimer = null;
		}
	}

	scheduleSuspend(id) {
		const inst = this.instances[id];
		if (!inst || !inst.view || id === this.activeId) return;
		this.clearSuspendTimer(id);
		inst.suspendTimer = setTimeout(() => {
			this.suspendAccount(id);
		}, SUSPEND_AFTER_MS);
	}

	suspendAccount(id) {
		const inst = this.instances[id];
		if (!inst || !inst.view || id === this.activeId) return;
		console.log(`Suspending account "${inst.name}" (${id}) — freeing memory`);
		this.clearSuspendTimer(id);
		try {
			this.window.contentView.removeChildView(inst.view);
			inst.view.webContents.close();
		} catch (e) {
			console.warn(`Suspend of "${id}" failed: ${e.message}`);
		}
		inst.view = null;
	}

	setCurrentView(id) {
		const instance = this.instances[id];
		if (!instance) {
			// conta nunca carregada (lazy): cria agora
			const view = this.ensureAccountView(id);
			if (!view) return;
		}

		// Hide all account views, show only the active one
		for (const aid in this.instances) {
			if (this.instances[aid].view)
				this.instances[aid].view.setVisible(aid === id);
		}

		this.activeId = id;

		const inst = this.instances[id];
		this.window.setTitle(`${Constants.appName} :: ${inst.name}`);
		if (inst.view) {
			this.layoutAccountView(id);
			inst.view.webContents.focus();
		}

		// (Re)agenda a suspensão das outras contas e cancela a da ativa
		this.clearSuspendTimer(id);
		for (const aid in this.instances)
			this.scheduleSuspend(aid);

		// Notify sidebar
		if (this.sidebarView) {
			this.sidebarView.webContents.send(Constants.event.activeAccount, id);
			this.sidebarView.webContents.send(Constants.event.reloadAccounts);
		}
	}

	cycleAccount(dir) {
		if (this.accounts.length < 2) return;
		const idx = this.accounts.findIndex(a => a.id === this.activeId);
		const next = (idx + dir + this.accounts.length) % this.accounts.length;
		this.setCurrentView(this.accounts[next].id);
	}

	getSidebarWidth() {
		return this.sidebarCollapsed ? Constants.sidebar.collapsedWidth : Constants.sidebar.width;
	}

	layoutAccountView(id) {
		const inst = this.instances[id];
		if (!inst || !inst.view) return;
		const view = inst.view;
		const b = this.window.getContentBounds();
		const sbw = this.getSidebarWidth();
		view.setBounds({ x: sbw, y: 0, width: b.width - sbw, height: b.height });
	}

	updateSidebarBounds() {
		if (!this.sidebarView) return;
		const h = this.window.getContentBounds().height;
		const sbw = this.getSidebarWidth();
		this.sidebarView.setBounds({ x: 0, y: 0, width: sbw, height: h });
		this.sidebarView.webContents.send(Constants.event.sidebarState, this.sidebarCollapsed);
	}

	scheduleStoreBounds() {
		if (this._boundsTimer) return;
		this._boundsTimer = setTimeout(() => {
			this._boundsTimer = null;
			this.storeWindowBounds();
		}, BOUNDS_DEBOUNCE_MS);
	}

	storeWindowBounds() {
		this.bounds = this.window.getBounds();
		this.store.set("bounds", this.bounds);
		this.updateSidebarBounds();
		for (const id in this.instances)
			this.layoutAccountView(id);
	}

	updateTrayBadgeCounter() {
		if (!this.tray) return;
		let counter = 0;
		for (const id in this.instances)
			counter += this.instances[id].unread;

		if (counter == 0) {
			this.tray.setImage(fs.existsSync(this.trayIcon)
				? nativeImage.createFromPath(this.trayIcon)
				: nativeImage.createFromPath(this.baseIcon));
			this.tray.setToolTip(Constants.appName);
			return;
		}
		this.tray.setToolTip(`${Constants.appName} — ${counter} não lidas`);
		if (this.sidebarView)
			this.sidebarView.webContents.send(Constants.event.buildBadgeIcon, counter);
	}

	reloadCurrentView() {
		if (!this.activeId) return;
		const inst = this.instances[this.activeId];
		if (!inst || !inst.view) return;
		inst.view.webContents.reload();
		// O evento de reinicialização do preload é enviado pelo did-finish-load,
		// já com o tipo correto da conta (ver createAccountView).
	}

	openDevTools() {
		if (this.activeId && this.instances[this.activeId] && this.instances[this.activeId].view)
			this.instances[this.activeId].view.webContents.openDevTools({ mode: "detach" });
		else if (this.sidebarView)
			this.sidebarView.webContents.openDevTools({ mode: "detach" });
	}

	// ── Compartilhamento de tela ──
	openScreenSharePicker() {
		if (this.sharePicker && !this.sharePicker.isDestroyed()) {
			this.sharePicker.show();
			this.sharePicker.focus();
			return;
		}
		this.sharePicker = new BrowserWindow({
			width: 720,
			height: 540,
			minWidth: 480,
			minHeight: 360,
			parent: this.window,
			modal: true,
			show: false,
			autoHideMenuBar: true,
			title: "Compartilhar tela",
			backgroundColor: "#111b21",
			icon: this.baseIcon,
			webPreferences: {
				preload: path.join(__dirname, "screenshare-preload.js"),
				contextIsolation: true,
				nodeIntegration: false
			}
		});
		this.sharePicker.loadFile(path.join(__dirname, "screenshare.html"));
		this.sharePicker.once("ready-to-show", () => this.sharePicker.show());
		this.sharePicker.on("closed", () => { this.sharePicker = null; });
		// Se o usuário fechar a janela sem escolher, cancela o pedido pendente
		this.sharePicker.on("close", () => {
			if (this.shareCurrent) {
				try { this.shareCurrent.callback(null); } catch (e) {}
				this.shareCurrent = null;
			}
		});
	}

	closeSharePicker() {
		if (this.sharePicker && !this.sharePicker.isDestroyed())
			this.sharePicker.close();
		this.sharePicker = null;
	}

	showHide(hide = true) {
		if (!this.window.isFocused()) {
			if (this.window.isVisible())
				this.window.focus();
			else if (this.window.isMinimized()) {
				this.window.restore();
				this.window.focus();
			} else {
				this.window.show();
				this.window.restore();
				this.window.focus();
			}
		} else {
			if (hide)
				this.window.hide();
		}
	}
}

let Constants = {};
const ws = new MultiChatApp();

app.whenReady().then(() => {
	Constants = require("./constants").init(app.getSystemLocale());
	ws.init();
});

app.on('second-instance', () => {
	ws.showHide(false);
});

app.on('activate', () => {
	// macOS: clique no ícone do Dock reabre a janela
	ws.showHide(false);
});

app.on('before-quit', () => {
	ws.isQuit = true;
	if (ws.sharePicker && !ws.sharePicker.isDestroyed())
		ws.sharePicker.destroy();
});

app.on('window-all-closed', () => {
	// No macOS o app continua no Dock; nas outras plataformas encerra
	// apenas quando pedido via menu/tray (isQuit).
	if (process.platform !== 'darwin' && ws.isQuit)
		app.quit();
});
