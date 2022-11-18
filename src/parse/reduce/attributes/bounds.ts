import { isEmpty } from "../../../utils/deepEquals.js"

export type Bounds = {
    min?: Bound
    max?: Bound
}

export type Bound = {
    limit: number
    inclusive: boolean
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

export const assignBoundsIntersection = (a: Bounds, b: Bounds) => {
    if (b.min) {
        const result = boundIntersection("min", a, b.min)
        if (result === null) {
            return null
        }
        a.min = result
    }
    if (b.max) {
        const result = boundIntersection("max", a, b.max)
        if (result === null) {
            return null
        }
        a.max = result
    }
    return a
}

const boundIntersection = (
    kind: BoundKind,
    a: Bounds,
    boundOfB: Bound
): Bound | null => {
    const invertedKind = invertedKinds[kind]
    const baseCompeting = a[kind]
    const baseOpposing = a[invertedKind]
    if (baseOpposing && isStricter(kind, boundOfB, baseOpposing)) {
        return null
    }
    if (!baseCompeting || isStricter(kind, boundOfB, baseCompeting)) {
        return boundOfB
    }
    return baseCompeting
}

const invertedKinds = {
    min: "max",
    max: "min"
} as const

type BoundKind = keyof typeof invertedKinds

const isStricter = (kind: BoundKind, candidate: Bound, base: Bound) => {
    if (
        candidate.limit === base.limit &&
        candidate.inclusive === false &&
        base.inclusive === true
    ) {
        return true
    } else if (kind === "min") {
        return candidate.limit > base.limit
    } else {
        return candidate.limit < base.limit
    }
}
