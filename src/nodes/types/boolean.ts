import type { Compare } from "../node.js"
import { compareIfLiteral } from "./literals.js"

export type BooleanAttributes = {
    readonly literal: boolean
}

export const compareBooleans: Compare<BooleanAttributes> = (l, r) =>
    compareIfLiteral(l, r, checkBoolean)!

export const checkBoolean = (data: boolean, attributes: BooleanAttributes) =>
    attributes.literal === undefined || attributes.literal === data
