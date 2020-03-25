import { Page, Browser } from "playwright-core"

export type Context = {
    browser: Browser
    page: Page
}
