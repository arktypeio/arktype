import { readFileSync } from "fs"
import { BrowserWindow } from "electron"
import { join } from "path"
import { launch, Step, Browser } from "@re-do/run"
import { deepEquals } from "@re-do/utils"
import { Root } from "common"
import { Store } from "react-statelessly"
// // @ts-ignore
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
    const { page, browser, context } = await launch(
        store.get("defaultBrowser"),
        {
            position: {
                x: x + DEFAULT_LEARNER_WIDTH,
                y: y - BROWSER_WINDOW_TITLEBAR_SIZE
            },
            size: {
                height: height - 16,
                width: width - DEFAULT_LEARNER_WIDTH
            }
        }
    )
    lastConnectedBrowser = browser

    // @ts-ignore
    await context._enableRecorder({
        language: "test",
        startRecording: true
    })

    const getNewStepId = () => {
        const existingSteps = store.get("builder/steps")
        if (!existingSteps.length) {
            return 1
        }
        return existingSteps[existingSteps.length - 1].id + 1
    }
    let lastNavigationStep: Step
    page.on("framenavigated", async (frame) => {
        const navigationStep = { kind: "go" as const, url: frame.url() }
        if (!deepEquals(navigationStep, lastNavigationStep)) {
            lastNavigationStep = navigationStep
            store.update({
                builder: {
                    steps: (_) =>
                        _.concat({ ...navigationStep, id: getNewStepId() })
                }
            })
        }
        await page.evaluate(browserJs)
    })
    const notify = (eventData: EventData) => {
        if (eventData.timeStamp === lastEventData?.timeStamp) {
            // looks like a duplicate, ignoring
            return
        }
        const { timeStamp, ...step } = eventData
        store.update({
            builder: {
                steps: (steps) => [...steps, { ...step, id: getNewStepId() }]
            }
        })
        lastEventData = eventData
    }
    await page.exposeFunction("notify", notify)
}

export const closeBrowser = async () => {
    try {
        await lastConnectedBrowser.close()
    } catch (e) {
        // TODO: Stop from unnecessarily logging an error here
        console.log("Browser was already disconnected.")
    }
}
