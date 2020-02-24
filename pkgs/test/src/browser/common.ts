import { chromium as chrome, firefox, webkit as safari } from "playwright-core"
import { Unpromisified } from "@re-do/utils"

export const browserHandlers = {
    chrome,
    firefox,
    safari
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
}
