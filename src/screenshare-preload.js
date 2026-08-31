const { contextBridge, ipcRenderer } = require('electron');
const Constants = require('./constants').init('pt-BR');

contextBridge.exposeInMainWorld("electron", {
	getShareSources: () => ipcRenderer.invoke(Constants.event.getShareSources),
	setShareSelected: (id) => ipcRenderer.send(Constants.event.setShareSelected, id),
	setShareCancelled: () => ipcRenderer.send(Constants.event.setShareCancelled)
});
