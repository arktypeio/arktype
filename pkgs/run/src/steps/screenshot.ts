import { ScreenshotArgs } from "@re-do/model"
import { Context } from "../common.js"

export type { ScreenshotArgs } from "@re-do/model"

export const screenshot = async (args: ScreenshotArgs, { page }: Context) => {
    await page.screenshot()
}
