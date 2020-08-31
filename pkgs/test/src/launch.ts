import { asserted } from "@re-do/utils"
import {
    BrowserType,
    Browser,
    chromium,
    firefox,
    webkit
} from "playwright-core"

export type BrowserName = "chrome" | "firefox" | "safari"

export type LaunchOptions = Parameters<BrowserType<string>["launch"]>[0]

export const launch = async (browser: BrowserName, options?: LaunchOptions) => {
    let instance: Browser
    if (browser === "chrome") {
        instance = await chromium.launch(options)
    } else if (browser === "firefox") {
        instance = await firefox.launch(options)
    } else {
        instance = await webkit.launch(options)
    }
    return {
        browser: instance,
        page: await instance.newPage()
    }
}
