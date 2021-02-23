import { BrowserType, chromium, firefox, webkit } from "playwright-core"

export type LaunchOptions = Parameters<BrowserType<string>["launch"]>[0]

export const browserHandlers = {
    chrome: chromium,
    firefox,
    safari: webkit
}

export type BrowserName = keyof typeof browserHandlers

const addDefaults = (options: LaunchOptions): LaunchOptions => ({
    headless: false,
    ...options
})

export const launch = async (
    browser: BrowserName,
    options: LaunchOptions = {}
) => {
    const browserHandler = browserHandlers[browser]
    const instance = await browserHandler.launch(addDefaults(options))
    return {
        browser: instance,
        page: await instance.newPage()
    }
}
