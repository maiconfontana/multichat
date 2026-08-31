const { contextBridge, ipcRenderer } = require('electron');

let Constants = null;

const BADGE_ICON_SRC = "file://" + require('path').join(__dirname, "../assets/icon-32.png");

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

// Main sends init-resources before the window is shown
ipcRenderer.on("init-resources", (event, data) => {
	Constants = data.constants;
	ipcRenderer.on(Constants.event.buildBadgeIcon, (event, counter) => buildBadgeIcon(counter));
});

contextBridge.exposeInMainWorld("electron", {
	getAccounts: () => ipcRenderer.invoke(Constants.event.getAccountsList),
	addAccount: (data) => ipcRenderer.send(Constants.event.addAccount, data),
	updateAccount: (data) => ipcRenderer.send(Constants.event.updateAccount, data),
	deleteAccount: (id) => ipcRenderer.send(Constants.event.deleteAccount, id),
	gotoAccount: (id) => ipcRenderer.send(Constants.event.gotoAccount, id),
	toggleNotifications: (id, enabled) => ipcRenderer.send(Constants.event.toggleNotifications, { id, enabled }),
	toggleSidebar: () => ipcRenderer.send(Constants.event.toggleSidebar),
	onSidebarState: (cb) => ipcRenderer.on(Constants.event.sidebarState, (e, collapsed) => cb(collapsed)),

	reloadAccounts: (cb) => ipcRenderer.on(Constants.event.reloadAccounts, cb),
	onUpdateUnread: (cb) => ipcRenderer.on(Constants.event.updateUnread, (e, data) => cb(data)),
	onActiveAccount: (cb) => ipcRenderer.on(Constants.event.activeAccount, (e, id) => cb(id))
});
