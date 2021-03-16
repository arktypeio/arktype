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
    options: LaunchOptions = {}
) => {
    const browserHandler = browserHandlers[browser]
    const instance = await browserHandler.launch({
        headless: false
    })
    const bootstrapper = await instance.newPage()
    const [page] = await Promise.all([
        bootstrapper.waitForEvent("popup"),
        bootstrapper.evaluate(() =>
            window.open(undefined, undefined, "resizable,scrollbars")
        )
    ])
    await page.evaluate(({ position, size }: LaunchOptions) => {
        if (size) {
            window.resizeTo(size.width, size.height)
        }
        if (position) {
            window.moveTo(position.x, position.y)
        }
    }, options)
    try {
        // Calling bootstrapper.close() directly closes spawned page as well
        await bootstrapper.evaluate(() => window.close())
    } catch (e) {
        if (e?.message?.includes("page has been closed")) {
            // Safari throws a protocol error like this that we can ignore
        } else {
            throw e
        }
    }
    return {
        browser: instance,
        page
    }
}
