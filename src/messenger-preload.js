const { ipcRenderer } = require('electron');

let instanceId = null;
let instanceName = null;
let Constants = null;
let lastUnread = 0;

// Intercept window.Notification to forward to main process
class GenericNotificationServer {
	constructor(title, options = {}) {
		if (!instanceId || !Constants) return;
		
		const notifData = {
			id: instanceId,
			title: title,
			options: {
				body: options.body || '',
				tag: options.tag || '',
				icon: options.icon || ''
			}
		};

		// Fetch icon if provided
		if (options.icon) {
			fetch(options.icon)
				.then(r => r.blob())
				.then(blob => new Promise(res => {
					const reader = new FileReader();
					reader.onload = e => res(e.target.result);
					reader.readAsDataURL(blob);
				}))
				.then(dataUrl => {
					notifData.icon = dataUrl;
					ipcRenderer.send(Constants.event.newRendererNotification, notifData);
				})
				.catch(() => {
					ipcRenderer.send(Constants.event.newRendererNotification, notifData);
				});
		} else {
			ipcRenderer.send(Constants.event.newRendererNotification, notifData);
		}
	}

	static permission = 'granted';
	static maxActions = 3;
	static requestPermission(cb) {
		if (typeof cb === 'function') cb('granted');
		return Promise.resolve('granted');
	}
	close() {}
}

window.Notification = GenericNotificationServer;

// Watch document title for unread count: e.g. "(3) Teams", "(12) Telegram"
const extractUnreadFromTitle = () => {
	const match = document.title.match(/^\((\d+)\)/);
	const unread = match ? parseInt(match[1], 10) : 0;
	if (unread !== lastUnread && instanceId && Constants) {
		lastUnread = unread;
		ipcRenderer.send(Constants.event.updateUnreadMessages, { id: instanceId, unread });
	}
};

// Title mutation observer
const titleEl = document.querySelector('title');
if (titleEl) {
	new MutationObserver(extractUnreadFromTitle).observe(titleEl, { childList: true, characterData: true });
} else {
	setInterval(extractUnreadFromTitle, 2000);
}

ipcRenderer.on("init-generic-instance", (event, data) => {
	instanceId = data.id;
	instanceName = data.name;
	Constants = data.constants;
	console.log(`Generic messenger initialized for "${instanceName} (${instanceId})"`);
});
