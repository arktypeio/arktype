import p, { Page, Browser } from "puppeteer"
import { ValueOf } from "redo-utils"

export const test = async (...steps: Step[]) => {
    const browser = await p.launch({ headless: false, slowMo: 250 })
    const page = await browser.newPage()
    await page.goto("https://redo.qa")
    await page.screenshot({ path: "before.png" })
    for (const step of steps) {
        await redo({ step, context: { browser, page } })
    }
    await page.screenshot({ path: "after.png" })
    await browser.close()
    return true
}

export type Context = {
    browser: Browser
    page: Page
}

export type RedoArgs = {
    step: Step
    context: Context
}

export const redo = async ({ step: [type, args], context }: RedoArgs) => {
    await stepTypes[type](args as any, context)
}

export type ClickArgs = {
    selector: string
}

export const click = async ({ selector }: ClickArgs, { page }: Context) => {
    await page.click(selector)
}

export type GoArgs = {
    url: string
}

export const go = async ({ url }: GoArgs, { page }: Context) =>
    await page.goto(url)

export type SetArgs = {
    selector: string
    value: string
}

export const set = async ({ selector, value }: SetArgs, { page }: Context) => {
    await page.type(selector, value)
}

export type ScreenshotArgs = {}

export const screenshot = async (args: ScreenshotArgs, { page }: Context) => {
    await page.screenshot()
}

export const stepTypes = {
    click,
    go,
    set,
    screenshot
}

export type StepTypes = typeof stepTypes

export type StepKey = keyof StepTypes

export type Step = ValueOf<
    { [K in keyof StepTypes]: [K, Parameters<StepTypes[K]>[0]] }
>
