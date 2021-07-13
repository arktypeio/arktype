import { defaultStepKinds, Step } from "./steps"
import { launch, BrowserName, LaunchOptions } from "./launch"
import { Page, Browser, StepKinds } from "./common"

export type TestOptions = LaunchOptions & {
    browser?: BrowserName
    customStepKinds?: StepKinds
}

export const test = async (steps: Step[], options: TestOptions = {}) => {
    let page: Page | undefined
    let browser: Browser | undefined
    try {
        const {
            browser: browserName = "chrome",
            customStepKinds,
            ...rest
        } = options
        ;({ page, browser } = await launch(browserName, rest))
        const stepKinds = { ...defaultStepKinds, ...customStepKinds }
        for (const step of steps) {
            const { kind, ...args } = step
            await stepKinds[kind](args as any, { browser, page })
        }
    } finally {
        if (page && !page.isClosed()) {
            await page.close()
        }
        if (browser && browser.isConnected()) {
            await browser.close()
        }
    }
}
