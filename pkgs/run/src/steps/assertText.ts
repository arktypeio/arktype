import { AssertTextArgs } from "@re-do/model"
import { Context } from "../common.js"

export type { SetArgs } from "@re-do/model"

export const assertText = async (
    { element, value }: AssertTextArgs,
    { page }: Context
) => {
    const text = await page.textContent(element.selector)
    if (!text?.includes(value)) {
        throw new Error(
            `Element ${element.selector} had text value ${text}. Expected ${value}.`
        )
    }
}
