import type { Attributes } from "./attributes.js"

export const reduceOptionality: Attributes.Reducer<[setTo: boolean]> = (
    base,
    setTo
) => (base.optional === setTo ? base : { ...base, optional: setTo })
