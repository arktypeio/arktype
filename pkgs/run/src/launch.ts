import { chromium, firefox, webkit } from "playwright"
import {} from "playwright/lib/generated/recorderSource"

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
    const args = []
    if (position) {
        args.push(`--window-position=${position.x},${position.y}`)
    }
    if (size) {
        args.push(`--window-size=${size.width},${size.height}`)
    }
    const instance = await browserHandler.launch({
        headless: false,
        args
    })
    const context = await instance.newContext({ viewport: null })
    const page = await context.newPage()
    return {
        browser: instance,
        context,
        page
    }
}
