import { app } from "electron"
import { autoUpdater } from "electron-updater"
import { installExtensions } from "./extensions"
import { createMainWindow, createBuilderWindow } from "./windows"
import { isDev } from "@re-do/node-utils"

app.on("ready", async () => {
    if (isDev()) {
        await installExtensions()
    } else {
        await autoUpdater.checkForUpdatesAndNotify()
    }
    await createMainWindow()
    await createBuilderWindow()
})

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit()
    }
})
