import { Context } from "../common"

export type ClickArgs = {
    selector: string
}

export const click = async ({ selector }: ClickArgs, { page }: Context) => {
    await page.click(selector)
}
