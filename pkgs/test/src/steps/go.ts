import { Context } from "../common"

export type GoArgs = {
    url: string
}

export const go = async ({ url }: GoArgs, { page }: Context) =>
    await page.goto(url)
