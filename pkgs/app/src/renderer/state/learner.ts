import { readFileSync, chmodSync, mkdirp } from "fs-extra"
/* Important we use this format as opposed to import { ... } from "puppeteer".
Puppeteer is actually a class object whose methods rely on this, which will
be undefined if we use that style of import.
*/
// TODO: Figure out how to import puppeteer using import { ... } from "puppeteer"
// this functionality worked previously but broke when switching to babel
import p from "puppeteer-core"
import { remote, Rectangle } from "electron"
import { isDeepStrictEqual } from "util"
import { join, resolve } from "path"
import { homedir } from "os"
import { createHandle } from "react-statelessly"
import {
    StepCreateWithoutUserCreateOnlyInput as StepInput,
    TagCreateWithoutTestCreateOnlyInput as TagInput
} from "@re-do/model"
import { store } from "renderer/common"
import { isDev } from "@re-do/utils"

const BROWSER_WINDOW_TITLEBAR_SIZE = 35
const DEFAULT_LEARNER_WIDTH = 300

export type Bounds = {
    height: number
    width: number
    x: number
    y: number
}

const getMainWindowBounds = (): Bounds => ({
    ...remote.getCurrentWindow().getBounds()
})

// TODO: Make sure bounds are within screen size
const setMainWindowBounds = (bounds: Partial<Bounds>) => {
    remote.getCurrentWindow().unmaximize()
    // Electron actually allows partial bounds, @types/electron is just incorrect
    remote.getCurrentWindow().setBounds(bounds as Rectangle)
}

export type Learner = {
    active: boolean
    events: StepInput[]
    lastConnectedEndpoint: string
    testName: string
    testTags: TagInput[]
    lastMainWindowBounds: Bounds
    chromiumInstalling: boolean
}

export const handleLearner = createHandle<Learner>({
    active: async _ => await (_ ? start() : stop())
})

export const learnerInitial: Learner = {
    active: false,
    events: [],
    testName: "",
    testTags: [],
    lastConnectedEndpoint: "",
    lastMainWindowBounds: {
        height: -1,
        width: -1,
        x: -1,
        y: -1
    },
    chromiumInstalling: false
}

const start = async () => {
    const executablePath = await getChromiumExecutable()
    // Ensure the chromium installation we're using from puppeteer is executable
    chmodSync(executablePath, "755")
    // Use size and position from the Redo app to launch browser
    const lastMainWindowBounds = getMainWindowBounds()
    const { height, width, x, y } = lastMainWindowBounds
    const newMainWindowBounds = { height, width: DEFAULT_LEARNER_WIDTH, x, y }
    const browserBounds = {
        height: height + BROWSER_WINDOW_TITLEBAR_SIZE,
        width: width - DEFAULT_LEARNER_WIDTH,
        x: x + DEFAULT_LEARNER_WIDTH,
        y: y - BROWSER_WINDOW_TITLEBAR_SIZE
    }
    setMainWindowBounds(newMainWindowBounds)
    const browser = await p.launch({
        executablePath,
        headless: false,
        defaultViewport: null,
        args: [
            `--window-position=${browserBounds.x},${browserBounds.y}`,
            `--window-size=${browserBounds.width},${browserBounds.height}`
        ]
    })
    const page = (await browser.pages())[0]
    await page.exposeFunction("notify", notify)
    const browserJs = readFileSync(
        resolve(isDev() ? "dist" : __dirname, "injected.js"),
        "utf-8"
    )
    await page.evaluateOnNewDocument(browserJs)
    await page.goto("https://google.com")
    browser.on("disconnected", () => {
        deactivateLearner()
    })
    await store.mutate({
        learner: {
            lastConnectedEndpoint: browser.wsEndpoint(),
            lastMainWindowBounds: lastMainWindowBounds
        }
    })
}

const stop = async () => {
    const {
        learner: { lastConnectedEndpoint, lastMainWindowBounds }
    } = store.query({
        learner: { lastConnectedEndpoint: true, lastMainWindowBounds: true }
    })
    if (lastConnectedEndpoint) {
        try {
            const browser = await p.connect({
                browserWSEndpoint: lastConnectedEndpoint
            })
            await browser.close()
        } catch (e) {
            // TODO: Stop from unnecessarily logging an error here
            console.log("Browser was already disconnected.")
        }
    }
    if (
        !isDeepStrictEqual(
            lastMainWindowBounds,
            learnerInitial.lastMainWindowBounds
        )
    ) {
        setMainWindowBounds(lastMainWindowBounds)
    }
}

export const deactivateLearner = async () => {
    await store.mutate({
        learner: {
            active: false
        }
    })
}

export const resetLearner = async () => {
    await store.mutate({
        learner: {
            events: [],
            testName: "",
            testTags: []
        }
    })
}

const notify = (event: StepInput) => {
    try {
        store.mutate({
            learner: { events: _ => _.concat(event) }
        })
    } catch (e) {
        console.log(e)
    }
}

const getChromiumExecutable = async () => {
    const redoDir = join(homedir(), ".redo")
    const chromiumDir = join(redoDir, "chromium")
    await mkdirp(chromiumDir)
    const browserFetcher = p.createBrowserFetcher({ path: chromiumDir })
    const targetRevision = require("puppeteer-core/package.json").puppeteer
        .chromium_revision
    const existingRevisions = await browserFetcher.localRevisions()
    if (!existingRevisions.includes(targetRevision)) {
        await store.mutate({
            learner: { chromiumInstalling: true }
        })
        console.log(
            `Updating your Chromium installation to ${targetRevision}...`
        )
        for (const revision of existingRevisions) {
            console.log(`Deleting old Chromium (revision ${revision})...`)
            await browserFetcher.remove(revision)
        }
        await browserFetcher.download(targetRevision)
        await store.mutate({ learner: { chromiumInstalling: false } })
    }
    const pathFromChromium = p.executablePath().split(".local-chromium")[1]
    const chromiumPath = join(chromiumDir, pathFromChromium)
    return chromiumPath
}
