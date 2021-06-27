import { ClickArgs } from "@re-do/model"
import { Context } from "../common"

export type { ClickArgs } from "@re-do/model"

export const click = async ({ element }: ClickArgs, { page }: Context) => {
    await page.click(element.selector)
}
