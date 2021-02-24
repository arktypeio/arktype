import { chromium, firefox, webkit } from "playwright-core"

export type LaunchOptions = {
    size?: {
        height: number
        width: number
    }
    position?: {
        x: number
        y: number
    }
}

export const browserHandlers = {
    chrome: chromium,
    firefox,
    safari: webkit
}

export type BrowserName = keyof typeof browserHandlers

export const launch = async (
    browser: BrowserName,
    { size, position }: LaunchOptions = {}
) => {
    const browserHandler = browserHandlers[browser]
    const browserLaunchArgs: string[] = []
    if (position) {
        browserLaunchArgs.push(`--window-position=${position.x},${position.y}`)
    }
    const instance = await browserHandler.launch({
        headless: false,
        args: browserLaunchArgs
    })
    const page = await instance.newPage({
        viewport: size ? { height: size.height, width: size.width } : undefined
    })
    return {
        browser: instance,
        page
    }
}
