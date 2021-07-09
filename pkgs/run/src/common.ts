import { Page, Browser } from "playwright"
export type { Page, Browser } from "playwright"

export type StepKinds = Record<
    string,
    (args: any, context: Context) => Promise<void>
>

export type Context = {
    browser: Browser
    page: Page
}
