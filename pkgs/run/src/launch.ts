import {
    chromium,
    firefox,
    webkit,
    LaunchOptions as PlaywrightLaunchOptions
} from "playwright-core"
import { existsSync } from "fs"
import { shell, shellAsync } from "@re-do/node"

export type LaunchOptions = {
    size?: {
        height: number
        width: number
    }
    position?: {
        x: number
        y: number
    }
} & PlaywrightLaunchOptions

export const browserHandlers = {
    chrome: chromium,
    firefox,
    safari: webkit
}

export const playwrightBrowserNames = {
    chrome: "chromium",
    firefox: "firefox",
    safari: "webkit"
}

export type BrowserName = keyof typeof browserHandlers

export const isBrowserInstalled = (browser: BrowserName) =>
    existsSync(browserHandlers[browser].executablePath())

export const ensureBrowserInstalled = async (browser: BrowserName) => {
    const expectedBrowserPath = browserHandlers[browser].executablePath()
    if (!isBrowserInstalled(browser)) {
        console.log(
            `Didn't find ${browser} at ${expectedBrowserPath}. Installing...`
        )
        const installationResult = await shellAsync(
            `npx playwright install ${playwrightBrowserNames[browser]}`,
            { all: true }
        )
        if (!isBrowserInstalled(browser)) {
            throw new Error(
                `Tried to install ${browser} but didn't find it at expected location ${expectedBrowserPath}. Output:\n` +
                    installationResult.all
            )
        }
    }
}

export const launch = async (
    browser: BrowserName,
    { size, position, ...playwrightOptions }: LaunchOptions = {}
) => {
    await ensureBrowserInstalled(browser)
    const browserHandler = browserHandlers[browser]
    const args = []
    if (position) {
        args.push(`--window-position=${position.x},${position.y}`)
    }
    if (size) {
        args.push(`--window-size=${size.width},${size.height}`)
    }
    const instance = await browserHandler.launch({
        ...playwrightOptions,
        args: [...args, ...(playwrightOptions.args || [])]
    })
    const context = await instance.newContext({ viewport: null })
    const page = await context.newPage()
    return {
        browser: instance,
        context,
        page
    }
}
