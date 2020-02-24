import { chromium as chrome, firefox, webkit as safari } from "playwright"
import { ensureChromiumPath } from "./install"

export const browsers = {
    chrome,
    firefox,
    safari
}

export type BrowserTypes = typeof browsers
export type BrowserName = keyof BrowserTypes

export type LaunchOptions<Name extends BrowserName> = Parameters<
    BrowserTypes[Name]["launch"]
>[0]

const addDefaults = async <Name extends BrowserName>(
    options?: LaunchOptions<Name>
) => ({
    headless: false,
    slowMo: 50,
    // executablePath: await ensureChromiumPath(),
    ...options
})

export const launch = async <Name extends BrowserName>(
    name: Name,
    options?: LaunchOptions<Name>
) => {
    return await browsers[name].launch(await addDefaults(options))
}
