'use strict';
// Buttons of the app's own local pages (starting / failed / connect) only.
// Pages from a Dpro server (local or remote) get nothing from here.
const { contextBridge, ipcRenderer } = require('electron');

if (window.location.protocol === 'file:') {
  contextBridge.exposeInMainWorld('dproDesktop', {
    connect: url => ipcRenderer.invoke('dpro:connect', String(url)),
    useLocal: () => ipcRenderer.invoke('dpro:use-local'),
    retry: () => ipcRenderer.invoke('dpro:retry'),
    openConnect: () => ipcRenderer.invoke('dpro:open-connect'),
  });
}
