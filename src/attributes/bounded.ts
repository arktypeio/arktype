import type { Reducer } from "./shared.js"

export namespace Bounded {
    export type Attribute = Readonly<{
        lower?: Bound
        upper?: Bound
    }>

    export type Bound = Readonly<{
        limit: number
        inclusive: boolean
    }>

    export const reduce: Reducer<"bounded"> = (base, candidate) => {
        if (!base) {
            return [candidate]
        }
        let currentBase = base
        let updated = false
        if (candidate?.lower) {
            const lowerResult = addLimit("lower", currentBase, candidate.lower)
            if (lowerResult) {
                if (lowerResult === "never") {
                    return "never"
                }
                currentBase = lowerResult
                updated = true
            }
        }
        if (candidate?.upper) {
            const upperResult = addLimit("upper", currentBase, candidate.upper)
            if (upperResult) {
                if (upperResult === "never") {
                    return "never"
                }
                currentBase = upperResult
                updated = true
            }
        }
        return updated ? [currentBase] : []
    }

    const invertedKinds = {
        lower: "upper",
        upper: "lower"
    } as const

    type BoundKind = keyof Attribute

    const isStricter = (
        kind: BoundKind,
        candidateBound: Bound,
        baseBound: Bound
    ) => {
        if (
            candidateBound.limit === baseBound.limit &&
            candidateBound.inclusive === false &&
            baseBound.inclusive === true
        ) {
            return true
        } else if (kind === "lower") {
            return candidateBound.limit > baseBound.limit
        } else {
            return candidateBound.limit < baseBound.limit
        }
    }

    const addLimit = (
        kind: BoundKind,
        base: Attribute,
        bound: Bound
    ): Attribute | "never" | undefined => {
        const invertedKind = invertedKinds[kind]
        const baseCompeting = base?.[kind]
        const baseOpposing = base?.[invertedKind]
        if (baseCompeting && !isStricter(kind, bound, baseCompeting)) {
            return
        }
        if (baseOpposing && isStricter(invertedKind, bound, baseOpposing)) {
            return "never"
        }
        return {
            [kind]: bound,
            [invertedKind]: baseOpposing
        }
    }
}
