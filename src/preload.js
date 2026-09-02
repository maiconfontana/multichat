const { contextBridge, ipcRenderer } = require('electron');

let Constants = null;

// Caminho RELATIVO (o renderer já é servido de dentro do app): evita
// require('path'), proibido em preload sandboxed (module not found: path).
const BADGE_ICON_SRC = "../assets/icon-32.png";

// Desenha o badge do tray (contador sobre o logo) e devolve um dataURL.
// A fonte e o círculo escalam com o tamanho real do ícone (em vez de fixo
// em 512px), e o contador é limitado a 999+ para não transbordar.
const buildBadgeIcon = (counter) => {
	const label = counter > 999 ? '999+' : String(counter);
	const image = new Image();
	image.onload = () => {
		const size = image.width || 32;
		var canvas = document.createElement("canvas");
		var ctx = canvas.getContext("2d");
		canvas.width = size;
		canvas.height = size;
		ctx.drawImage(image, 0, 0, size, size);

		const radius = Math.max(8, size * 0.40);
		const centerX = (size * .75) - (size * .02);
		const centerY = (size * .25) + (size * .02);
		ctx.beginPath();
		ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
		ctx.fillStyle = '#ff3333';
		ctx.fill();
		ctx.lineWidth = Math.max(1, size / 16);
		ctx.strokeStyle = '#003300';
		ctx.stroke();

		const fontSize = radius * (label.length >= 3 ? 0.95 : 1.25);
		ctx.font = `bold ${Math.round(fontSize)}px Arial`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = '#ffffff';
		ctx.fillText(label, centerX, centerY + fontSize * .06);

		var data = canvas.toDataURL("image/png");
		ipcRenderer.send(Constants.event.updateBadgeIcon, data);
	};
	image.src = BADGE_ICON_SRC;
};

// Recebe as constantes do main. Chega tanto no envio imediato (pós-loadFile)
// quanto reenviado no did-finish-load — ver createSidebarView no main.js —
// então a race "evento chega antes do listener" não derruba mais a sidebar.
ipcRenderer.on("init-resources", (event, data) => {
	if (Constants) return; // idempotente
	Constants = data.constants;
	console.log("[sidebar] preload OK — API window.electron exposta");
	ipcRenderer.on(Constants.event.buildBadgeIcon, (event, counter) => buildBadgeIcon(counter));
});

contextBridge.exposeInMainWorld("electron", {
	getAccounts: () => ipcRenderer.invoke(Constants && Constants.event.getAccountsList),
	addAccount: (data) => ipcRenderer.send(Constants && Constants.event.addAccount, data),
	updateAccount: (data) => ipcRenderer.send(Constants && Constants.event.updateAccount, data),
	deleteAccount: (id) => ipcRenderer.send(Constants && Constants.event.deleteAccount, id),
	reorderAccounts: (ids) => ipcRenderer.send(Constants && Constants.event.reorderAccounts, ids),
	gotoAccount: (id) => ipcRenderer.send(Constants && Constants.event.gotoAccount, id),
	toggleNotifications: (id, enabled) => ipcRenderer.send(Constants && Constants.event.toggleNotifications, { id, enabled }),
	toggleSidebar: () => ipcRenderer.send(Constants && Constants.event.toggleSidebar),
	onSidebarState: (cb) => ipcRenderer.on("sidebar-state", (e, collapsed) => cb(collapsed)),

	reloadAccounts: (cb) => ipcRenderer.on("reload-accounts", cb),
	onUpdateUnread: (cb) => ipcRenderer.on("update-unread", (e, data) => cb(data)),
	onActiveAccount: (cb) => ipcRenderer.on("active-account", (e, id) => cb(id))
});
