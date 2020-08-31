import { perform, Step } from "./steps"
import { launch, BrowserName, LaunchOptions } from "./launch"

export type TestOptions = LaunchOptions & {
    browser?: BrowserName
}

export const test = async (steps: Step[], options: TestOptions = {}) => {
    const { browser: browserName = "chrome", ...rest } = options
    const { page, browser } = await launch(browserName, rest)
    await page.goto("https://redo.qa")
    await page.screenshot({ path: "before.png" })
    for (const step of steps) {
        await perform(step, { browser, page })
    }
    await page.screenshot({ path: "after.png" })
    await page.close()
    await browser.close()
}
