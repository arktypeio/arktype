import type { Attributes } from "./attributes.js"

export const reduceOptionality: Attributes.Reducer<[setTo: boolean]> = (
    base,
    setTo
) => (base.isOptional === setTo ? base : { ...base, isOptional: setTo })
