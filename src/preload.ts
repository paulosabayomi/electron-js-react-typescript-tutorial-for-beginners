// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

ipcRenderer.on('new-folder-update-menu', (event, data) => {
    console.log("data update from menu", data);
})

const preload = {
    get_dir: async (path?: string) => {
        const dirs = await ipcRenderer.invoke('get-dir', path);
        console.log("dirs", dirs);
        return dirs
        // ipcRenderer.send
        // ipcRenderer.emit
        // ipcRenderer
    },
    get_file: async (path: string) => {
        const file = await ipcRenderer.invoke('get-file', path);
        console.log("file", file);
        return file
        // ipcRenderer.send
        // ipcRenderer.emit
        // ipcRenderer
    },
    open_context_menu: (path: string, callback_fn: Function) => {
        ipcRenderer.send('context-menu', path);
        ipcRenderer.on('new-folder-update', (event, data) => {
            console.log("data update", data);
            callback_fn(data)            
        })
    }
}

contextBridge.exposeInMainWorld('electron', preload)

export type TPreload = typeof preload