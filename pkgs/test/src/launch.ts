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
    const server = await browserHandler.launchServer(addDefaults(options))
    const endpoint = server.wsEndpoint()
    const instance = await browserHandler.connect({ wsEndpoint: endpoint })
    return {
        browser: instance,
        page: await instance.newPage(),
        endpoint
    }
}
