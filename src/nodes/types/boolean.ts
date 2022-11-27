import { hasKey } from "../../utils/generics.js"
import type { IntersectFn, PruneFn } from "../node.js"

export type BooleanAttributes = { readonly literal?: boolean }

export const intersectBooleans: IntersectFn<BooleanAttributes> = (l, r) => {
    if (l.literal !== undefined && r.literal !== undefined) {
        return l.literal === r.literal
            ? l
            : { never: "true and false have no overlap" }
    }
    return l.literal !== undefined ? l : r
}

export const pruneBoolean: PruneFn<BooleanAttributes> = (l, r) => {
    if (l.literal !== undefined) {
        return l.literal === r.literal ? undefined : l
    }
}

export const checkBoolean = (data: boolean, attributes: BooleanAttributes) =>
    attributes.literal === undefined || attributes.literal === data
