import { readFileSync } from "fs-extra"
import { BrowserWindow } from "electron"
import { resolve } from "path"
import { launch, Step } from "@re-do/test"
import { Browser } from "playwright"
import { Root } from "state"
import { Store } from "react-statelessly"

const BROWSER_WINDOW_TITLEBAR_SIZE = 44
const DEFAULT_LEARNER_WIDTH = 300

let lastConnectedBrowser: Browser

export const launchBrowser = async (
    store: Store<Root>,
    mainWindow: BrowserWindow
) => {
    // Use size and position from the Redo app to launch browser
    const { height, width, x, y } = mainWindow.getBounds()
    const { page, browser } = await launch(store.get("defaultBrowser"), {
        position: {
            x: x + DEFAULT_LEARNER_WIDTH,
            y: y
        },
        size: {
            height: height - BROWSER_WINDOW_TITLEBAR_SIZE,
            width: width - DEFAULT_LEARNER_WIDTH
        }
    })
    lastConnectedBrowser = browser
    page.goto("https://redo.qa")
    const notify = (step: Step) => {
        store.update({
            steps: (steps) => [...steps, step]
        })
    }
    await page.exposeFunction("notify", notify)
    const browserJs = readFileSync(
        resolve("dist", "observer", "index.js"),
        "utf-8"
    )
    await page.evaluate(browserJs)
}

export const closeBrowser = async () => {
    try {
        await lastConnectedBrowser.close()
    } catch (e) {
        // TODO: Stop from unnecessarily logging an error here
        console.log("Browser was already disconnected.")
    }
}
