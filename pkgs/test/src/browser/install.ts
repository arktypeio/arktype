import { browserHandlers, BrowserName } from "./common"

export const installBrowserIfNeeded = async (name: BrowserName) => {
    await browserHandlers[name].downloadBrowserIfNeeded()
    return browserHandlers[name].executablePath()
}

export const installMissingBrowsers = async () => {
    for (const name in browserHandlers) {
        await browserHandlers[name as BrowserName].downloadBrowserIfNeeded()
    }
}
