'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('idle', {
	getUiTheme: () => ipcRenderer.invoke('get-ui-theme'),
	onUiTheme: cb => ipcRenderer.on('ui-theme', (e, dark) => cb(!!dark)),
	onState: cb => ipcRenderer.on('idle-state', (e, state) => cb(state || {})),
	addAccount: () => ipcRenderer.send('idle-add-account')
});
