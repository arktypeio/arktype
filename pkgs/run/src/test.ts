import { perform, Step } from "./steps"
import { launch, BrowserName, LaunchOptions } from "./launch"

export type TestOptions = LaunchOptions & {
    browser?: BrowserName
}

export const test = async (steps: Step[], options: TestOptions = {}) => {
    const { browser: browserName = "chrome", ...rest } = options
    const { page, browser } = await launch(browserName, rest)
    for (const step of steps) {
        await perform(step, { browser, page })
    }
    await page.close()
    await browser.close()
}
