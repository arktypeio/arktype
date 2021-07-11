import { Page, Browser } from "playwright"
import { dependencies } from "../package.json"
export type { Page, Browser } from "playwright"

export const PLAYWRIGHT_VERSION = dependencies.playwright

export type StepKinds = Record<
    string,
    (args: any, context: Context) => Promise<void>
>

export type Context = {
    browser: Browser
    page: Page
}
