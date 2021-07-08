import { app } from "electron"
import { installDevTools } from "./installDevTools"
import { createMainWindow, createBuilderWindow } from "./windows"
import { isDev } from "@re-do/node-utils"

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
