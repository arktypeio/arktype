import { throwInternalError } from "../utils/errors.js"
import type { Attribute } from "./attributes.js"
import { defineOperations } from "./attributes.js"

const baseStringOperations = {
    intersection: <t extends string>(a: t, b: t) => (a === b ? a : null),
    union: <t extends string>(a: t, b: t) => (a === b ? undefined : a)
}

export const type = defineOperations<Attribute<"type">>()(baseStringOperations)

export const value =
    defineOperations<Attribute<"value">>()(baseStringOperations)

const throwUnexpandedAliasError = () =>
    throwInternalError("Unexpected attempt to operate on unexpanded alias")

export const alias = defineOperations<Attribute<"alias">>()({
    intersection: throwUnexpandedAliasError,
    union: throwUnexpandedAliasError
})
