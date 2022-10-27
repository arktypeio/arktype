/* eslint-disable max-lines-per-function */
import type { Mutable } from "../internal.js"
import { throwInternalError } from "../internal.js"
import type { Scanner } from "../parser/string/state/scanner.js"
import type { Attributes } from "./attributes.js"
import { reduceType } from "./type.js"

export const reduceBound: Attributes.Reducer<
    [comparator: Scanner.Comparator, limit: number]
> = (base, comparator, limit) => {
    if (comparator === "==") {
        if (
            (base.max &&
                (limit > base.max ||
                    (limit === base.max && !base.inclusiveMax))) ||
            (base.min &&
                (limit < base.min ||
                    (limit === base.min && !base.inclusiveMin)))
        ) {
            return reduceType(base, "never")
        }
        return {
            ...base,
            min: limit,
            inclusiveMin: true,
            max: limit,
            inclusiveMax: true
        }
    }
    const boundAttributeUpdates: Pick<
        Mutable<Attributes>,
        "inclusiveMax" | "inclusiveMin" | "max" | "min"
    > = {}
    if (comparator === "<" || comparator === "<=") {
        if (base.max === undefined || limit < base.max) {
            if (base.min && limit < base.min) {
                return reduceType(base, "never")
            }
            boundAttributeUpdates.max = limit
            if (comparator === "<=") {
                boundAttributeUpdates.inclusiveMax = true
            }
        } else if (
            limit === base.max &&
            comparator === "<" &&
            base.inclusiveMax
        ) {
            boundAttributeUpdates.inclusiveMax = false
        } else {
            return base
        }
        if (limit === base.min && !base.inclusiveMin) {
            return reduceType(base, "never")
        }
        return {
            ...base,
            ...boundAttributeUpdates
        }
    } else if (comparator === ">" || comparator === ">=") {
        if (base.min === undefined || limit > base.min) {
            if (base.max && limit > base.max) {
                return reduceType(base, "never")
            }
            boundAttributeUpdates.min = limit
            if (comparator === ">=") {
                boundAttributeUpdates.inclusiveMin = true
            }
        } else if (
            limit === base.min &&
            comparator === ">" &&
            base.inclusiveMin
        ) {
            boundAttributeUpdates.inclusiveMin = false
        } else {
            return base
        }
        if (limit === base.max && !base.inclusiveMax) {
            return reduceType(base, "never")
        }
        return {
            ...base,
            ...boundAttributeUpdates
        }
    }
    return throwInternalError(`Unexpected comparator '${comparator}'.`)
}
