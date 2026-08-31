const { app, BrowserWindow, WebContentsView, ipcMain, Menu, Tray, nativeImage, Notification, desktopCapturer, session } = require('electron');
const Store = require('electron-store').default;
const path  = require('node:path');
const fs    = require('node:fs');

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

class MultiChatApp {
	constructor() {
		this.store      = new Store();
		this.baseIcon   = path.join(__dirname, "../assets/icon.png");
		this.isQuit     = false;
		this.spellLangs = ["en-US", "pt-BR"];
		this.activeId   = null;
		this.shareCurrent = null;
		this.sidebarCollapsed = this.store.get("sidebarCollapsed", false);

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

		this.menuTemplate = [
			{
				label: "MultiChat",
				submenu: [
					{ label: "Reload Current Account", accelerator: "Ctrl+R", click: () => { this.reloadCurrentView(); } },
					{ label: "Open DevTools (Account)", accelerator: "Ctrl+Shift+I", click: () => { this.openDevTools(); } },
					{ type: "separator" },
					{ label: "Quit", click: () => { this.isQuit = true; app.quit(); } }
				]
			},
			{
				label: 'Help',
				submenu: [
					{ label: "Version undefined by me", enabled: false },
					{ type: 'separator' },
					{ label: "Quit", click: () => { this.isQuit = true; app.quit(); } }
				]
			}
		];
	}

	_initElectronApp() {
		app.userAgentFallback = Constants.whatsapp.userAgent;
		if (process.platform == "win32")
			app.setAppUserModelId(Constants.appName);
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

		for (const item of this.accounts)
			this.createAccountView(item);

		this.menuTemplate[1].submenu[0].label = `Version ${Constants.version} (Electron@${process.versions.electron})`;
		this.menu = Menu.buildFromTemplate(this.menuTemplate);
		Menu.setApplicationMenu(this.menu);

		if (this.accounts.length > 0)
			this.setCurrentView(this.accounts[0].id);

		const trayMenu = Menu.buildFromTemplate([
			{ label: "Show/Hide", click: () => { this.showHide(); } },
			{ type: "separator" },
			{ label: "Quit", click: () => { this.isQuit = true; app.quit(); } }
		]);
		this.tray = new Tray(this.baseIcon);
		this.tray.setContextMenu(trayMenu);
		this.tray.setToolTip(Constants.appName);
		this.tray.on("click", () => { this.showHide(); });

		this.aciveNotifications = [];
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
				if (this.instances[data.id])
					this.instances[data.id].view.webContents.send(Constants.event.fireNotificationClick, data.options.tag);
				this.aciveNotifications = this.aciveNotifications.filter(_n => _n !== n);
			});
			n.on("close", () => {
				this.aciveNotifications = this.aciveNotifications.filter(_n => _n !== n);
			});
			this.aciveNotifications.push(n);
			n.show();
		});

		ipcMain.on(Constants.event.updateBadgeIcon, (event, dataURL) => {
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
			this.createAccountView(account);
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
			this.accounts.splice(toDelete, 1);
			this.store.set("accounts", this.accounts);

			if (this.instances[id]) {
				this.window.contentView.removeChildView(this.instances[id].view);
				delete this.instances[id];
			}

			const ses = session.fromPartition(`persist:${id}`);
			ses.clearStorageData().then(() => {
				const dir = ses.getStoragePath();
				fs.rmSync(dir, { recursive: true, force: true });
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
			this.sidebarCollapsed = !this.sidebarCollapsed;
			this.store.set("sidebarCollapsed", this.sidebarCollapsed);
			this.updateSidebarBounds();
			for (const id in this.instances)
				this.layoutAccountView(id);
		});
	}

	createWindow() {
		const options = {
			width: this.bounds.width,
			height: this.bounds.height,
			icon: this.baseIcon,
			show: !process.argv.includes("--start-in-tray")
		};
		if (this.bounds.x != null) {
			options.x = this.bounds.x;
			options.y = this.bounds.y;
		}

		this.window = new BrowserWindow(options);

		if (this.bounds.x == null)
			this.window.center();

		// Don't load any file directly — the sidebar and account views
		// will be added as child views of the window's contentView.

		this.window.on("move", () => { this.storeWindowBounds(); });
		this.window.on("resize", () => { this.storeWindowBounds(); });
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
		this.sidebarView.webContents.send(Constants.event.initResources, { constants: Constants });

		// Sidebar is always first (z-order: bottom)
		this.window.contentView.addChildView(this.sidebarView);
		this.updateSidebarBounds();

		// When sidebar finishes loading, notify it of the active account
		this.sidebarView.webContents.on("did-finish-load", () => {
			this.sidebarView.webContents.send(Constants.event.activeAccount, this.activeId);
			// Send initial accounts list
			this.sidebarView.webContents.send(Constants.event.reloadAccounts);
			// Send initial collapsed state
			this.sidebarView.webContents.send(Constants.event.sidebarState, this.sidebarCollapsed);
		});
	}

	createAccountView(account) {
		const id = account.id;
		const name = account.name;
		const type = account.type || "whatsapp";
		const url  = account.url || (Constants.services[type] ? Constants.services[type].url : Constants.whatsapp.url);
		const preloadFile = Constants.services[type] ? Constants.services[type].preload : "whatsapp-preload.js";

		console.log(`Creating account view for "${name} (${id})" [${type}]`);
		this.instances[id] = {
			id, name, type,
			unread: 0,
			notifications: account.notifications || { enabled: true },
			view: null
		};

		const view = new WebContentsView({
			webPreferences: {
				partition: `persist:${id}`,
				preload: path.join(__dirname, preloadFile),
				spellcheck: true,
				contextIsolation: false
			}
		});
		this.instances[id].view = view;

		if (this.spellLangs.length > 0)
			view.webContents.session.setSpellCheckerLanguages(this.spellLangs);

		view.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
			desktopCapturer.getSources({ types: ["screen", "window"] }).then((sources) => {
				this.shareCurrent = { id, callback };
				if (this.sidebarView)
					this.sidebarView.webContents.executeJavaScript(`showScreenShareModal('${id}');`);
			});
		}, { useSystemPicker: true });

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
			require('electron').shell.openExternal(details.url);
			return { action: 'deny' };
		});

		view.webContents.on("did-finish-load", () => {
			console.log(`Account "${name} (${id})" [${type}] loaded`);
			const initEvent = (preloadFile === "whatsapp-preload.js")
				? Constants.event.initWhatsAppInstance
				: Constants.event.initGenericInstance;
			view.webContents.send(initEvent, { id, name, constants: Constants });
		});

		// Start hidden — will be shown when set as current
		view.setVisible(false);
		this.window.contentView.addChildView(view);
		this.layoutAccountView(id);
	}

	setCurrentView(id) {
		const instance = this.instances[id];
		if (!instance) return;

		// Hide all account views, show only the active one
		for (const aid in this.instances) {
			this.instances[aid].view.setVisible(aid === id);
		}

		this.activeId = id;
		this.window.setTitle(`${Constants.appName} :: ${instance.name}`);
		this.layoutAccountView(id);
		instance.view.webContents.focus();

		// Notify sidebar
		if (this.sidebarView) {
			this.sidebarView.webContents.send(Constants.event.activeAccount, id);
			this.sidebarView.webContents.send(Constants.event.reloadAccounts);
		}
	}

	setCurrentViewByIdx(idx) {
		this.setCurrentView(this.accounts[idx].id);
	}

	getSidebarWidth() {
		return this.sidebarCollapsed ? Constants.sidebar.collapsedWidth : Constants.sidebar.width;
	}

	layoutAccountView(id) {
		const view = this.instances[id].view;
		if (!view) return;
		const w = this.window.getContentBounds().width;
		const h = this.window.getContentBounds().height;
		const sbw = this.getSidebarWidth();
		view.setBounds({ x: sbw, y: 0, width: w - sbw, height: h });
	}

	updateSidebarBounds() {
		if (!this.sidebarView) return;
		const h = this.window.getContentBounds().height;
		const sbw = this.getSidebarWidth();
		this.sidebarView.setBounds({ x: 0, y: 0, width: sbw, height: h });
		this.sidebarView.webContents.send(Constants.event.sidebarState, this.sidebarCollapsed);
	}

	storeWindowBounds() {
		this.bounds = this.window.getBounds();
		this.store.set("bounds", this.bounds);
		this.updateSidebarBounds();
		for (const id in this.instances)
			this.layoutAccountView(id);
	}

	updateTrayBadgeCounter() {
		let counter = 0;
		for (const id in this.instances)
			counter += this.instances[id].unread;

		if (counter == 0) {
			this.tray.setImage(this.baseIcon);
			this.tray.setToolTip(Constants.appName);
			return;
		}
		this.tray.setToolTip(`${Constants.appName} — ${counter} unread`);
		if (this.sidebarView)
			this.sidebarView.webContents.send(Constants.event.buildBadgeIcon, counter);
	}

	reloadCurrentView() {
		if (!this.activeId) return;
		const v = this.instances[this.activeId].view;
		v.webContents.reload();
		setTimeout(() => {
			v.webContents.send(Constants.event.initWhatsAppInstance, {
				id: this.activeId,
				name: this.instances[this.activeId].name,
				constants: Constants
			});
		}, 1500);
	}

	openDevTools() {
		if (this.activeId && this.instances[this.activeId])
			this.instances[this.activeId].view.webContents.openDevTools({ mode: "detach" });
		else if (this.sidebarView)
			this.sidebarView.webContents.openDevTools({ mode: "detach" });
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

app.on('window-all-closed', () => {
	if (ws.isQuit)
		app.quit();
});
