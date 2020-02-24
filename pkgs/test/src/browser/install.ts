import { browserHandlers, BrowserName } from "./common"

export const installBrowser = async (name: BrowserName) => {
    await browserHandlers[name].downloadBrowserIfNeeded()
    return browserHandlers[name].executablePath()
}

export const installAllBrowsers = async () => {
    for (const name in browserHandlers) {
        await browserHandlers[name as BrowserName].downloadBrowserIfNeeded()
    }
}
