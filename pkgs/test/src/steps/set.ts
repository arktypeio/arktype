import { Context } from "../common"

export type SetArgs = {
    selector: string
    value: string
}

export const set = async ({ selector, value }: SetArgs, { page }: Context) => {
    await page.type(selector, value)
}
