import { defaultStepKinds, Step } from "./steps"
import { launch, BrowserName, LaunchOptions } from "./launch.js"
import { Page, Browser, StepKinds } from "./common.js"

export type TestOptions = LaunchOptions & {
    browser?: BrowserName
    customStepKinds?: StepKinds
    stepTimeout?: number
}

export const test = async (steps: Step[], options: TestOptions = {}) => {
    let page: Page | undefined
    let browser: Browser | undefined
    let testPassed = false
    try {
        const {
            browser: browserName = "chrome",
            customStepKinds,
            ...rest
        } = options
        ;({ page, browser } = await launch(browserName, rest))
        page.setDefaultTimeout((options.stepTimeout ?? 10) * 1000)
        const stepKinds = { ...defaultStepKinds, ...customStepKinds }
        for (const step of steps) {
            const { kind, ...args } = step
            await stepKinds[kind](args as any, { browser, page })
        }
        testPassed = true
    } finally {
        if (page && !page.isClosed()) {
            await page.close()
        }
        if (browser && browser.isConnected()) {
            await browser.close()
        }
    }
    return testPassed
}
