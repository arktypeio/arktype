import { defaultStepKinds, Step } from "./steps"
import { launch, BrowserName, LaunchOptions } from "./launch"
import { StepKinds } from "./common"

export type TestOptions = LaunchOptions & {
    browser?: BrowserName
    customStepKinds?: StepKinds
}

export const test = async (steps: Step[], options: TestOptions = {}) => {
    const {
        browser: browserName = "chrome",
        customStepKinds,
        ...rest
    } = options
    const { page, browser } = await launch(browserName, rest)
    const stepKinds = { ...defaultStepKinds, ...customStepKinds }
    for (const step of steps) {
        const { kind, ...args } = step
        await stepKinds[kind](args as any, { browser, page })
    }
    await page.close()
    await browser.close()
}
