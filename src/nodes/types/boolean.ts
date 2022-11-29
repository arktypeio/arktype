import { composeIntersection } from "./compose.js"
import type { LiteralChecker } from "./literals.js"

export type BooleanAttributes = {
    readonly literal: boolean
}

export const checkBoolean: LiteralChecker<BooleanAttributes> = (
    data,
    attributes
) => attributes.literal === undefined || attributes.literal === data

export const booleanIntersection = composeIntersection<BooleanAttributes>({
    literal: checkBoolean
})
