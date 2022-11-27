import { hasKey } from "../../utils/generics.js"
import type { IntersectFn, PruneFn } from "../node.js"

export type BooleanAttributes = { readonly literal?: boolean }

export const intersectBooleans: IntersectFn<BooleanAttributes> = (l, r) => {
    if (hasKey(l, "value") && hasKey(r, "value")) {
        return l.literal === r.literal
            ? l
            : { type: "never", reason: "true and false have no overlap" }
    }
    return hasKey(l, "value") ? l : r
}

export const pruneBoolean: PruneFn<BooleanAttributes> = (l, r) => {
    if (hasKey(l, "value")) {
        return l.literal === r.literal ? undefined : l
    }
}

export const checkBoolean = (data: boolean, attributes: BooleanAttributes) =>
    hasKey(attributes, "value") ? attributes.literal === data : true
