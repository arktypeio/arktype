import {
    chromium,
    firefox,
    webkit,
    LaunchOptions as PlaywrightLaunchOptions
} from "playwright-core"
import { existsSync } from "fs"
import { shell } from "@re-do/node-utils"

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

export const launch = async (
    browser: BrowserName,
    { size, position, ...playwrightOptions }: LaunchOptions = {}
) => {
    const browserHandler = browserHandlers[browser]
    const expectedBrowserPath = browserHandler.executablePath()
    if (!existsSync(expectedBrowserPath)) {
        console.log(
            `Didn't find ${browser} at ${expectedBrowserPath}. Installing...`
        )
        shell(`npx playwright install ${playwrightBrowserNames[browser]}`)
    }
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
