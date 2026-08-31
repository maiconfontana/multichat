// Preload do seletor de compartilhamento de tela.
// RODA EM SANDBOX: apenas require('electron') é permitido — nomes de
// eventos declarados como literais (não importar constants.js daqui).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("electron", {
	getShareSources: () => ipcRenderer.invoke("get-share-sources"),
	setShareSelected: (id) => ipcRenderer.send("set-share-selected", id),
	setShareCancelled: () => ipcRenderer.send("set-share-cancelled")
});
