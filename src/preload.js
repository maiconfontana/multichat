const { contextBridge, ipcRenderer } = require('electron');

let Constants = null;

const BADGE_ICON_SRC = "file://" + require('path').join(__dirname, "../assets/icon.png");

// Draw the tray badge icon (count on the app logo) and send dataURL back
const buildBadgeIcon = (counter) => {
	var image = new Image();
	image.setAttribute('crossorigin', 'anonymous');
	image.onload = () => {
		var canvas = document.createElement("canvas");
		var ctx = canvas.getContext("2d");
		canvas.width = image.width;
		canvas.height = image.height;
		ctx.drawImage(image, 0, 0, image.width, image.height);
		var centerX = (canvas.width * .75) - 2;
		var centerY = (canvas.height * .25) + 2;
		var radius = 128;
		ctx.beginPath();
		ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
		ctx.fillStyle = '#ff3333';
		ctx.fill();
		ctx.lineWidth = 2;
		ctx.strokeStyle = '#003300';
		ctx.stroke();
		ctx.font = 'bold 200px Arial';
		ctx.fillStyle = '#ffffff';
		ctx.fillText(String(counter), centerX - (counter >= 10 ? 110 : 55), centerY + 70);
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
	onUpdateUnread: (cb) => ipcRenderer.on(Constants.event.updateUnread, cb),
	onActiveAccount: (cb) => ipcRenderer.on(Constants.event.activeAccount, (e, id) => cb(id)),

	getShareSources: () => ipcRenderer.invoke(Constants.event.getShareSources),
	setShareSelected: (id) => ipcRenderer.send(Constants.event.setShareSelected, id),
	setShareCancelled: () => ipcRenderer.send(Constants.event.setShareCancelled)
});
