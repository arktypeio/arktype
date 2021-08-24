import { app } from "electron"
import { installDevTools } from "./installDevTools"
import {
    createMainWindow,
    createBuilderWindow,
    loadMainWindow,
    loadBuilderWindow
} from "./electronWindows.js"

app.on("ready", async () => {
    if (process.env["NODE_ENV"] === "development") {
        await installDevTools()
    }
    const main = createMainWindow()
    createBuilderWindow()
    await loadMainWindow()
    await loadBuilderWindow()
    main.maximize()
    main.show()
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
