import { app } from "electron"
import { installDevTools } from "./installDevTools"
import { createMainWindow, createBuilderWindow } from "./windows"

app.on("ready", async () => {
    if (process.env["NODE_ENV"] === "development") {
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
