 
const { ipcRenderer } = require('electron');

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
				requestIdleCallback(() => {
					this.countUnread(); // run once per callback
					unreadSchedule = false;
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

		setTimeout(() => {
			console.log("Starting Mutation Observer...");
			if (observeUnread()) return;
			console.log("No #pane-side yet, watching document.body for now...");
			const retarget = setInterval(() => {
				if (observeUnread()) {
					clearInterval(retarget);
					console.log("Unread observer scoped to #pane-side.");
				}
			}, 2000);
		}, 1000);

		const moduleCheckInterval = setInterval(() => {
			if (this.mrid != null && Object.keys(this.mrobj).length > 0) {
				clearInterval(moduleCheckInterval);
				return;
			}
			this.loadModuleRaid();
		}, 3000);

		// Events
		ipcRenderer.on(Constants.event.fireNotificationClick, (event, tag) => {
			//console.log("Received Notification Click from Main...", tag);
			this.openChat(tag);
		});
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

	async openChat (tag) {
		console.log(`bv-openChat: ${tag}`);

		let chatWid = this.findModule('createWid')[0].createWid(tag);
		//console.log("openChat chatWid", chatWid);

		let chat    = await this.findModule(m => m.default && m.default.Chat)[0].default.Chat.find(chatWid);
		//console.log("openChat chat", chat);

		/* To Debug on Browser
		let chatWid = wa.findModule('createWid')[0].createWid(tag);
		let chat    = await wa.findModule(m => m.default && m.default.Chat)[0].default.Chat.find(chatWid);
		await wa.findModule("Cmd")[0].Cmd.openChatBottom(chat);
		*/

		//await this.findModule("Cmd")[0].Cmd.openChatBottom(chat);
		await this.findModule("Cmd")[0].Cmd.openChatBottom({chat: chat});
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
		wa = new WhatsAppInstance(data.id, data.name);
		window.wa = wa;
	}
});
