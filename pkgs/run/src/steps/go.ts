import { GoArgs } from "@re-do/model"
import { Context } from "../common"

export type { GoArgs } from "@re-do/model"

export const go = async ({ url }: GoArgs, { page }: Context) => {
    await page.goto(url)
}
