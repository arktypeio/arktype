import { Context } from "../common"

export type ScreenshotArgs = {}

export const screenshot = async (args: ScreenshotArgs, { page }: Context) => {
    await page.screenshot()
}
