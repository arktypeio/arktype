import { deepEquals, isEmpty } from "../utils/deepEquals.js"
import { defineOperations } from "./attributes.js"
import { Contradiction } from "./contradiction.js"

export type Bounds = {
    min?: Bound
    max?: Bound
}

export type Bound = {
    limit: number
    inclusive?: true
}

export const bounds = defineOperations<Bounds>()({
    intersect: (a, b) => {
        if (b.min) {
            const result = intersectBound("min", a, b.min)
            if (result instanceof Contradiction) {
                return result
            }
            a.min = result
        }
        if (b.max) {
            const result = intersectBound("max", a, b.max)
            if (result instanceof Contradiction) {
                return result
            }
            a.max = result
        }
        return a
    },
    extract: (a, b) => {
        const result: Bounds = {}
        if (a.min && deepEquals(a.min, b.min)) {
            result.min = a.min
        }
        if (a.max && deepEquals(a.max, b.max)) {
            result.max = a.max
        }
        return result
    },
    exclude: ({ ...a }, b) => {
        if (
            a.min &&
            b.min &&
            (b.min === a.min || isStricter("min", b.min, a.min))
        ) {
            delete a.min
        }
        if (
            a.max &&
            b.max &&
            (b.max === a.max || isStricter("max", b.max, a.max))
        ) {
            delete a.max
        }
        return isEmpty(a) ? null : a
    }
})

const intersectBound = (
    kind: BoundKind,
    base: Bounds,
    bound: Bound
): Bound | Contradiction => {
    const invertedKind = invertedKinds[kind]
    const baseCompeting = base[kind]
    const baseOpposing = base[invertedKind]
    if (baseOpposing && isStricter(kind, bound, baseOpposing)) {
        return new Contradiction(
            buildEmptyRangeMessage(kind, bound, baseOpposing)
        )
    }
    if (!baseCompeting || isStricter(kind, bound, baseCompeting)) {
        return bound
    }
    return baseCompeting
}

export const buildEmptyRangeMessage = (
    kind: BoundKind,
    bound: Bound,
    opposing: Bound
) =>
    `the range bounded by ${stringifyBound(
        "min",
        kind === "min" ? bound : opposing
    )} and ${stringifyBound("max", kind === "max" ? bound : opposing)} is empty`

const stringifyBound = (kind: BoundKind, bound: Bound) =>
    `${kind === "min" ? "<" : ">"}${bound.inclusive ? "=" : ""}${bound.limit}`

const invertedKinds = {
    min: "max",
    max: "min"
} as const

type BoundKind = keyof typeof invertedKinds

const isStricter = (kind: BoundKind, candidate: Bound, base: Bound) => {
    if (
        candidate.limit === base.limit &&
        !candidate.inclusive &&
        base.inclusive === true
    ) {
        return true
    } else if (kind === "min") {
        return candidate.limit > base.limit
    } else {
        return candidate.limit < base.limit
    }
}
