import { isEmpty } from "../../../utils/deepEquals.js"
import { Contradiction } from "./contradiction.js"
import type { AttributeIntersection } from "./intersection.js"

export type Bounds = {
    min?: Bound
    max?: Bound
}

export type Bound = {
    limit: number
    inclusive?: true
}

export const assignBoundsDifference = (a: Bounds, b: Bounds) => {
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

export const assignBoundsIntersection: AttributeIntersection<"bounds"> = (
    a,
    b
) => {
    if (b.min) {
        const result = boundIntersection("min", a, b.min)
        if (result instanceof Contradiction) {
            return result
        }
        a.min = result
    }
    if (b.max) {
        const result = boundIntersection("max", a, b.max)
        if (result instanceof Contradiction) {
            return result
        }
        a.max = result
    }
    return a
}

const boundIntersection = (
    kind: BoundKind,
    a: Bounds,
    boundOfB: Bound
): Bound | Contradiction => {
    const invertedKind = invertedKinds[kind]
    const baseCompeting = a[kind]
    const baseOpposing = a[invertedKind]
    if (baseOpposing && isStricter(kind, boundOfB, baseOpposing)) {
        return new Contradiction(
            buildEmptyRangeMessage(kind, boundOfB, baseOpposing)
        )
    }
    if (!baseCompeting || isStricter(kind, boundOfB, baseCompeting)) {
        return boundOfB
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
