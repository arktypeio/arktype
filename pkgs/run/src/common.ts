import { Page, Browser } from "playwright-core"
export type { Page, Browser } from "playwright-core"
import { version } from "playwright-core/package.json"

export const PLAYWRIGHT_VERSION = version

export type StepKinds = Record<
    string,
    (args: any, context: Context) => Promise<void>
>

export type Context = {
    browser: Browser
    page: Page
}
