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
    let pageLaunchArgs: string[] = []
    if (position) {
        pageLaunchArgs.push(`x:${position.x}`, `y:${position.y}`)
    }
    if (size) {
        pageLaunchArgs.push(`height:${size.height}`, `width:${size.width}`)
    }
    const instance = await browserHandler.launch({
        headless: false
    })
    const page = await instance.newPage({
        viewport: size ? { height: size.height, width: size.width } : undefined
    })
    // const [popup] = await Promise.all([
    //     page.waitForEvent("popup"),
    //     page.evaluate(
    //         (args) => window.open(undefined, undefined, args),
    //         pageLaunchArgs.join(",")
    //     )
    // ])
    return {
        browser: instance,
        page
    }
}
