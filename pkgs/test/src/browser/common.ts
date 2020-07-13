import { chromium, firefox, webkit, Page } from "playwright-core"
import { Unpromisified } from "@re-do/utils"
import { fromRedo, ensureDir } from "@re-do/utils/dist/node"

export const BROWSERS_DIR = fromRedo("browsers")
ensureDir(BROWSERS_DIR)
const handlerConfig = { _projectRoot: BROWSERS_DIR }

export const browserHandlers = {
    chrome: Object.assign(chromium, handlerConfig),
    firefox: Object.assign(firefox, handlerConfig),
    safari: Object.assign(webkit, handlerConfig)
} as const

export type BrowserHandlers = typeof browserHandlers
export type BrowserName = keyof BrowserHandlers

type PlaywrightBrowserInstances = {
    [Name in BrowserName]: Unpromisified<
        ReturnType<BrowserHandlers[Name]["launch"]>
    >
}

export type Browser<
    Name extends BrowserName
> = PlaywrightBrowserInstances[Name] & {
    wsEndpoint: string
    page: Page
}
