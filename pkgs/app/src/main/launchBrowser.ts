import { readFileSync } from "fs"
import { BrowserWindow } from "electron"
import { join } from "path"
import {
    launch,
    Step,
    Browser,
    isBrowserInstalled,
    ensureBrowserInstalled
} from "@re-do/run"
import { deepEquals } from "@re-do/utils"
import { Root } from "common"
import { Store } from "react-statelessly"
// import playwright from "playwright-core"

// const {
//     RecorderSupplement
// } = require("playwright/lib/server/supplements/recorderSupplement")

type EventData = Step & { timeStamp: number }

const BROWSER_WINDOW_TITLEBAR_SIZE = 44
const DEFAULT_LEARNER_WIDTH = 300

let lastConnectedBrowser: Browser
let lastEventData: EventData

const browserJs = readFileSync(
    join(__dirname, "..", "observer", "index.js"),
    "utf-8"
)

export const launchBrowser = async (
    store: Store<Root, any>,
    mainWindow: BrowserWindow
) => {
    // Use size and position from the Redo app to launch browser
    const { height, width, x, y } = mainWindow.getBounds()
    // @ts-ignore
    const browserName = store.get("defaultBrowser")
    if (!isBrowserInstalled(browserName)) {
        store.update({ builder: { installingBrowser: browserName } })
        await ensureBrowserInstalled(browserName)
        store.update({ builder: { installingBrowser: "" } })
    }
    const { page, browser, context } = await launch(browserName, {
        position: {
            x: x + DEFAULT_LEARNER_WIDTH,
            y: y - BROWSER_WINDOW_TITLEBAR_SIZE
        },
        size: {
            height: height - 16,
            width: width - DEFAULT_LEARNER_WIDTH
        },
        headless: false
    })
    lastConnectedBrowser = browser
    const getNextId = () => {
        const existingSteps = store.get("builder/steps")
        if (!existingSteps.length) {
            return 1
        }
        return existingSteps[existingSteps.length - 1].id + 1
    }
    // const serverContext = (playwright as any)._toImpl(context)
    // const recorder = await RecorderSupplement.show(serverContext, {
    //     language: "test",
    //     startRecording: true
    // })

    // recorder._generator.on("change", () => {
    //     store.update({
    //         builder: {
    //             actions: (_) => _.concat({ ...navigationStep, id: getNextId() })
    //         }
    //     })
    // })

    let lastNavigationStep: Step
    page.on("framenavigated", async (frame) => {
        const navigationStep = { kind: "go" as const, url: frame.url() }
        if (!deepEquals(navigationStep, lastNavigationStep)) {
            lastNavigationStep = navigationStep
            store.update({
                builder: {
                    steps: (_) =>
                        _.concat({ ...navigationStep, id: getNextId() })
                }
            })
        }
        await page.evaluate(browserJs)
    })
    const notify = (eventData: EventData) => {
        if (eventData.kind === "init") {
            store.update({ main: { __browserLaunched: [] } })
            return
        }
        if (eventData.timeStamp === lastEventData?.timeStamp) {
            // looks like a duplicate, ignoring
            return
        }
        const { timeStamp, ...step } = eventData
        store.update({
            builder: {
                steps: (steps) => [...steps, { ...step, id: getNextId() }]
            }
        })
        lastEventData = eventData
    }
    await page.exposeFunction("notify", notify)
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
