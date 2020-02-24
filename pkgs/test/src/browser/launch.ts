import { asserted } from "@re-do/utils"
import {
    BrowserName,
    BrowserHandlers,
    browserHandlers,
    Browser
} from "./common"

export type LaunchOptions<Name extends BrowserName> = Parameters<
    BrowserHandlers[Name]["launchServer"]
>[0]

const addDefaults = async <Name extends BrowserName>(
    options?: LaunchOptions<Name>
) => ({
    headless: false,
    slowMo: 50,
    ...options
})

export const launch = async <Name extends BrowserName>(
    name: Name,
    options?: LaunchOptions<Name>
) => {
    const server = await browserHandlers[name].launchServer(
        await addDefaults(options)
    )
    const wsEndpoint = asserted(server.wsEndpoint(), "playwright endpoint")
    const browser = await browserHandlers[name].connect({ wsEndpoint })
    return Object.assign(browser, { wsEndpoint }) as Browser<Name>
}
