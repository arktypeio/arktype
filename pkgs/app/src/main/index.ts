import { app } from "electron"
import { createMainWindow, createBuilderWindow } from "./electronWindows.js"

app.on("ready", async () => {
    if (process.env["NODE_ENV"] === "development") {
        const { installDevTools } = await import("./installDevTools.js")
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
    e.preventDefault()
    process.exit(0)
})
