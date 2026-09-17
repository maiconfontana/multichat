'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('assistant', {
	getSettings: () => ipcRenderer.invoke('assistant:get-settings'),
	saveSettings: settings => ipcRenderer.invoke('assistant:save-settings', settings),
	testConnection: settings => ipcRenderer.invoke('assistant:test-connection', settings),
	saveProfiles: settings => ipcRenderer.invoke('assistant:save-profiles', settings),
	getSelection: payload => ipcRenderer.invoke('assistant:get-selection', payload),
	setSelection: payload => ipcRenderer.invoke('assistant:set-selection', payload),
	capture: () => ipcRenderer.invoke('assistant:capture'),
	generate: payload => ipcRenderer.invoke('assistant:generate', payload),
	insertDraft: payload => ipcRenderer.invoke('assistant:insert-draft', payload),
	close: () => ipcRenderer.send('assistant:close'),
	openExternal: url => ipcRenderer.invoke('assistant:open-external', url),
	getUiTheme: () => ipcRenderer.invoke('get-ui-theme'),
	onUiTheme: cb => ipcRenderer.on('ui-theme', (e, dark) => cb(!!dark))
});
