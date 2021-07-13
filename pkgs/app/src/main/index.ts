import { app, BrowserWindow } from "electron"
import { installDevTools } from "./installDevTools"
import { createMainWindow, createBuilderWindow } from "./windows"
import { isDev, shell } from "@re-do/node-utils"

app.on("ready", async () => {
    if (isDev()) {
        await installDevTools()
    }
    await createMainWindow()
    await createBuilderWindow()
})

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit()
    }
})
app.on("before-quit", (e) => {
    e.preventDefault();
    setTimeout(() => { process.exit(0) }, 500)
})