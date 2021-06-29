import { readFileSync } from "fs-extra"
import { BrowserWindow } from "electron"
import { resolve } from "path"
import { launch, Step } from "@re-do/test"
import { deepEquals } from "@re-do/utils"
import { Browser } from "playwright"
import { Root } from "common"
import { Store } from "react-statelessly"

type EventData = Step & { timeStamp: number }

const BROWSER_WINDOW_TITLEBAR_SIZE = 44
const DEFAULT_LEARNER_WIDTH = 300

let lastConnectedBrowser: Browser
let lastEventData: EventData

const browserJs = readFileSync(resolve("dist", "observer", "index.js"), "utf-8")

export const launchBrowser = async (
    store: Store<Root, any>,
    mainWindow: BrowserWindow
) => {
    // Use size and position from the Redo app to launch browser
    const { height, width, x, y } = mainWindow.getBounds()
    const { page, browser } = await launch(store.get("defaultBrowser"), {
        position: {
            x: x + DEFAULT_LEARNER_WIDTH,
            y: y - BROWSER_WINDOW_TITLEBAR_SIZE
        },
        size: {
            height: height - 16,
            width: width - DEFAULT_LEARNER_WIDTH
        }
    })
    lastConnectedBrowser = browser
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
        if (deepEquals(eventData, lastEventData)) {
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
