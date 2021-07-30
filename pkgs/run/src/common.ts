import { Page, Browser } from "playwright-core"
import { dependencies } from "../package.json"
export type { Page, Browser } from "playwright-core"

export const PLAYWRIGHT_VERSION = dependencies["playwright-core"]

export type StepKinds = Record<
    string,
    (args: any, context: Context) => Promise<void>
>

export type Context = {
    browser: Browser
    page: Page
}
