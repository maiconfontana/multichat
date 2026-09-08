 
const { ipcRenderer } = require('electron');
const AssistantAdapter = require('./whatsapp-assistant-adapter');

ipcRenderer.on('assistant:account-request', (event, request) => {
	if (!request || typeof request.id !== 'string') return;
	try {
		let result;
		if (request.action === 'capture') result = AssistantAdapter.extractVisibleContext(document);
		else if (request.action === 'insert') result = AssistantAdapter.insertDraft(document, String(request.payload?.conversationId || ''), String(request.payload?.draft || ''));
		else throw new Error('Ação do assistente inválida.');
		ipcRenderer.send('assistant:account-response', { id: request.id, result });
	} catch (error) {
		ipcRenderer.send('assistant:account-response', { id: request.id, error: String(error.message || error).slice(0, 300) });
	}
});

class WhatsAppInstance
{
	constructor(id, name) {
		// self
		this.id         = id;
		this.name       = name;
		this.lastUnread = 0;

		// Module Raid
		this.mrid  = null;
		this.mrobj = {};
		this.disposed = false;
		this.observeTimer = null;
		this.retargetInterval = null;
		this.idleCallback = null;
		this.notificationClickHandler = (event, tag) => {
			this.openChat(tag).catch(err => console.warn(`Could not open notification chat: ${err.message}`));
		};

		// Notification Wrapper
		window.oldNotification = Notification;
		window.Notification = NotificationServer;
		console.log("Window Notifications Object Replaced by NotificationServer...");

		// Mutation Oberver
		let unreadSchedule = false;
		this.observer = new MutationObserver((mutations) => {
			if (!unreadSchedule)
			{
				unreadSchedule = true;
				this.idleCallback = requestIdleCallback(() => {
					if (!this.disposed) this.countUnread(); // run once per callback
					unreadSchedule = false;
					this.idleCallback = null;
				}, {timeout: 1000});
			}

			if (this.mrid != null)
				return;

			for (const mutation of mutations)
			{
				if (typeof mutation.target.ariaLabel === 'string')
				{
					if (mutation.target.ariaLabel.search(Constants.whatsapp.profilePicture) != -1)
					{
						this.loadModuleRaid();
						break;
					}
				}
			}
		});

		const observeUnread = () => {
			const paneSide = document.getElementById("pane-side");
			this.observer.disconnect();
			this.observer.observe(paneSide || document.body, {
				characterData: true,
				childList: true,
				subtree: true,
			});
			return !!paneSide;
		};

		this.observeTimer = setTimeout(() => {
			if (this.disposed) return;
			console.log("Starting Mutation Observer...");
			if (observeUnread()) return;
			console.log("No #pane-side yet, watching document.body for now...");
			let attempts = 0;
			this.retargetInterval = setInterval(() => {
				attempts += 1;
				if (this.disposed || observeUnread() || attempts >= 30) {
					clearInterval(this.retargetInterval);
					this.retargetInterval = null;
					if (!this.disposed && attempts < 30)
						console.log("Unread observer scoped to #pane-side.");
				}
			}, 2000);
		}, 1000);

		// O catálogo interno do WhatsApp é pesado. Carregá-lo somente no clique
		// de uma notificação evita reter milhares de módulos em todas as contas.
		ipcRenderer.on(Constants.event.fireNotificationClick, this.notificationClickHandler);
	}

	getId() {
		return this.id;
	}

	loadModuleRaid() {
		console.log("Loading Module Raid...");
		this.mrid = Math.random().toString(36).substring(7);
		
		if (parseFloat(window.Debug.VERSION) < 2.3) {
			console.log("Module Raid: Using old stuff");
			window.webpackChunkwhatsapp_web_client.push([
				[this.mrid], {}, (e) => {
					Object.keys(e.m).forEach((mod) => {
						this.mrobj[mod] = e(mod);
					})
				}
			]);
		} else {
			console.log("Module Raid: Using new stuff");
			var _wai = this;
			let modules = self.require('__debug').modulesMap;
			Object.keys(modules).filter(e => e.includes("WA")).forEach(function (mod) {
				let modulos = modules[mod];
				if (modulos) {
					_wai.mrobj[mod] = {
						default: modulos.defaultExport,
						factory: modulos.factory,
						...modulos
					};
					if (Object.keys(_wai.mrobj[mod].default).length == 0) {
						try {
							self.ErrorGuard.skipGuardGlobal(true);
							Object.assign(_wai.mrobj[mod], self.importNamespace(mod));
						} catch (e) {}
					}
				}
			});
		}

		console.log(`Module Raid: Loaded ${Object.keys(this.mrobj).length} modules...`);
	}

	findModule(query) {
		if (Object.keys(this.mrobj).length === 0)
			this.loadModuleRaid();

		let results = [];
		let modules = Object.keys(this.mrobj);
		modules.forEach((mKey) => {
			let mod = this.mrobj[mKey];
			if (typeof mod !== 'undefined') {
				if (typeof query === 'string') {
					if (typeof mod.default === 'object') {
						for (const key in mod.default) {
							if (key == query) results.push(mod);
						}
					}
					for (const key in mod) {
						if (key == query) results.push(mod);
					}
				}
				else if (typeof query === 'function') {
					if (query(mod)) {
						results.push(mod);
					}
				}
				else {
					throw new TypeError('findModule can only find via string and function, ' + (typeof query) + ' was passed');
				}
			}
		});
		return results;
	}

	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		if (this.observeTimer) clearTimeout(this.observeTimer);
		if (this.retargetInterval) clearInterval(this.retargetInterval);
		if (this.idleCallback !== null && typeof cancelIdleCallback === 'function')
			cancelIdleCallback(this.idleCallback);
		this.observer.disconnect();
		ipcRenderer.removeListener(Constants.event.fireNotificationClick, this.notificationClickHandler);
		this.mrobj = {};
		if (window.Notification === NotificationServer && window.oldNotification)
			window.Notification = window.oldNotification;
	}

	async openChat (tag) {
		console.log(`bv-openChat: ${tag}`);

		const createWid = this.findModule('createWid')[0];
		const chatModule = this.findModule(m => m.default && m.default.Chat)[0];
		const commandModule = this.findModule("Cmd")[0];
		if (!createWid || !chatModule || !commandModule)
			throw new Error('required WhatsApp modules are unavailable');

		let chatWid = createWid.createWid(tag);
		//console.log("openChat chatWid", chatWid);

		let chat    = await chatModule.default.Chat.find(chatWid);
		//console.log("openChat chat", chat);

		/* To Debug on Browser
		let chatWid = wa.findModule('createWid')[0].createWid(tag);
		let chat    = await wa.findModule(m => m.default && m.default.Chat)[0].default.Chat.find(chatWid);
		await wa.findModule("Cmd")[0].Cmd.openChatBottom(chat);
		*/

		//await this.findModule("Cmd")[0].Cmd.openChatBottom(chat);
		await commandModule.Cmd.openChatBottom({chat: chat});
	}

	countUnread() {
		let unread  = 0;
		const itens = document.querySelectorAll('#pane-side [role="row"]>[role="gridcell"] [role="gridcell"][aria-colindex="1"]>span>div>span:not([data-icon], :has(svg))')
		for (const item of itens)
		{
			let parsedUnread = parseInt(item.innerText);
			if (Number.isNaN(parsedUnread))
				parsedUnread = 1;
			unread += parsedUnread;
		}

		if (this.lastUnread != unread)
		{
			this.lastUnread = unread;
			ipcRenderer.send(Constants.event.updateUnreadMessages, {id: this.id, unread: unread});
		}
	}
}

class NotificationServer
{
	constructor(title, options)
	{
		//console.log("New NotificationServer...", title, options);
		this._processOptions(title, options);
	}

	async _processOptions(title, options)
	{
		options.icon = options.icon.replace(Constants.whatsapp.url, "").replace("%3F", "?");
		const serverNotification = JSON.parse(JSON.stringify({
            id: wa.getId(),
			title: title,
			options: options,
			icon: await this._getIcon(options.icon)
		}));
		ipcRenderer.send(Constants.event.newRendererNotification, serverNotification);
	}

	_getIcon(icon)
	{
		if (!icon)
			return;

		return new Promise((resolve, reject) => {
			fetch(icon)
				.then((r) => r.blob())
				.catch(reject)
				.then((blob) => {
					const reader = new FileReader();
					reader.onload = (event) => resolve(event.target.result);
					reader.readAsDataURL(blob);
				});
		});
	}

	// wrapper compatibility
	static permission = 'granted';
	static maxActions = 3;
	static requestPermission(callback) {
		return new Promise((resolve, reject) => {
			if(typeof callback === 'function') {
				callback('granted');
			}
			resolve('granted');
		});
	}

	close() {}
}

// Events
let Constants = {};
let wa        = null;

ipcRenderer.on("init-whatsapp-instance", (event, data) => {
	console.log(`BrowserView ID: ${data.id} / Name: ${data.name}`);
	Constants = data.constants;
	
	// Check if whatsapp is calling google update
	const titleEl = document.querySelector('.landing-title');
	const isUpdate = titleEl && titleEl.innerHTML.includes('Google Chrome');
	
	if (isUpdate)
	{
		console.warn("Page requested chrome update...");
		
		navigator.serviceWorker.getRegistrations().then((regs) => {
			console.log("Unregistering ServiceWorkers...");
			
			for (const reg of regs)
				reg.unregister();
				
			if ('serviceWorker' in navigator) {
				caches.keys().then(function (cacheNames) {
					cacheNames.forEach(function (cacheName) {
						console.log("Clearing Cache Key: ", cacheName);
						caches.delete(cacheName);
					});
				});
			}
			
			console.log("Requesting reload to main process...");
			setTimeout(() => {
				ipcRenderer.send(Constants.event.clearWorkersAndReload, data.id);
			}, 1000);
		});
	}
	else
	{
		console.log(`Starting new WhatsAppInstance...`);
		if (wa) wa.dispose();
		wa = new WhatsAppInstance(data.id, data.name);
		//window.wa = wa;
	}
});
