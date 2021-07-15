import { SetArgs } from "@re-do/model"
import { Context } from "../common.js"

export type { SetArgs } from "@re-do/model"

export const set = async ({ element, value }: SetArgs, { page }: Context) => {
    await page.type(element.selector, value)
}
