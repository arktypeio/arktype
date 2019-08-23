import p, { Page } from "puppeteer"
import { BrowserEventInput } from "redo-model"
import { ValueFrom } from "redo-utils"

export const test = async (...steps: BrowserEventInput[]) => {
    const browser = await p.launch({ headless: false })
    const page = await browser.newPage()
    await page.goto("https://redo.qa")
    await page.screenshot({ path: "before.png" })
    steps.forEach(step => redo(step, page))
    await page.screenshot({ path: "after.png" })
    await browser.close()
    return true
}

export const redo = (step: BrowserEventInput, page: Page) => {
    stepTypes[step.type](step, page)
}

export const click = async ({ selector }: BrowserEventInput, page: Page) => {
    await page.click(selector)
}

// TODO: Update BrowserEventInput type in redo-model
export const stepTypes: {
    [K in ValueFrom<BrowserEventInput, "type">]: (
        step: BrowserEventInput,
        page: Page
    ) => Promise<void>
} = {
    click
}
