import p from "puppeteer-core"
import { BrowserType } from "playwright"
import { perform, Step } from "./steps"
import { ensureChromiumPath } from "./browser/install"
import { LaunchOptions, launch, BrowserName } from "./browser"

export type TestOptions<Browser extends BrowserName> = {
    browser: Browser
} & LaunchOptions<Browser>

export const test = async <Browser extends BrowserName>(
    steps: Step[],
    options?: TestOptions<Browser>
) => {
    const { browser: browserName, ...launchOptions } = {
        browser: "chrome" as const,
        ...options
    }
    const browser = await launch(browserName, launchOptions)
    const page = await browser.newPage()
    await page.goto("https://redo.qa")
    await page.screenshot({ path: "before.png" })
    for (const step of steps) {
        await perform(step, { browser, page })
    }
    await page.screenshot({ path: "after.png" })
    await browser.close()
    return true
}
