import type { dictionary, DynamicTypeName } from "../internal.js"
import { deepEquals } from "../utils/deepEquals.js"

type AtomicAttributeTypes = {
    typed: DynamicTypeName
    equals: unknown
    matches: string
    divisible: number
    bounded: Bounds
    optional: true
}

type AtomicAttributes = Partial<AtomicAttributeTypes>

type AtomicKey = keyof AtomicAttributes

type MaybeEjectedAttributes<ejected extends boolean> = ejected extends true
    ? EjectedAttributes
    : Attributes

type ComposedAttributes<ejected extends boolean> = Partial<{
    baseProp: MaybeEjectedAttributes<ejected>
    props: dictionary<MaybeEjectedAttributes<ejected>>
    // Fix
    branches: MaybeEjectedAttributes<ejected>[]
}>

export type EjectedAttributes = AtomicAttributes & ComposedAttributes<true>

export type Contradiction<key extends AtomicKey = AtomicKey> = {
    key: key
    base: AtomicAttributeTypes[key]
    intersection: AtomicAttributeTypes[key]
}

export class Attributes {
    private contradictions?: Contradiction[]
    private composed: ComposedAttributes<false> = {}

    constructor(
        private atomic: AtomicAttributes = {},
        private parent?: Attributes
    ) {}

    eject(): EjectedAttributes {
        const ejectedComposed: ComposedAttributes<true> = {}
        if (this.composed.baseProp) {
            ejectedComposed.baseProp = this.composed.baseProp.eject()
        }
        if (this.composed.props) {
            ejectedComposed.props = {}
            for (const k in this.composed.props) {
                ejectedComposed.props[k] = this.composed.props[k].eject()
            }
        }
        if (this.composed.branches) {
            ejectedComposed.branches = this.composed.branches.map((branch) =>
                branch.eject()
            )
        }
        return Object.assign(this.atomic, ejectedComposed)
    }

    addContradiction<key extends AtomicKey>(
        key: key,
        base: AtomicAttributes[key],
        intersection: AtomicAttributes[key]
    ) {
        this.contradictions ??= []
        this.contradictions.push({ key, base, intersection })
    }

    addEquality(value: unknown) {
        if ("equals" in this.atomic) {
            if (this.atomic.equals !== value) {
                this.addContradiction("equals", this.atomic.equals, value)
            }
        } else {
            this.atomic.equals = value
        }
    }

    addType(name: DynamicTypeName) {
        if (this.atomic.typed !== undefined) {
            if (this.atomic.typed !== name) {
                this.addContradiction("typed", this.atomic.typed, name)
            }
        } else {
            this.atomic.typed = name
        }
    }

    addBound(kind: BoundKind, bound: Bound) {
        if (this.atomic.bounded !== undefined) {
            if (!assignIntersectionToBounds(kind, this.atomic.bounded, bound)) {
                this.addContradiction(
                    "bounded",
                    { [kind]: this.atomic.bounded },
                    { [kind]: bound }
                )
            }
        } else {
            this.atomic.bounded = { [kind]: bound }
            // TODO: Add type
        }
    }

    addDivisor(divisor: number) {
        if (this.atomic.divisible !== undefined) {
            this.atomic.divisible = leastCommonMultiple(
                this.atomic.divisible,
                divisor
            )
        } else {
            this.atomic.divisible = divisor
            this.addType("number")
        }
    }

    addOptional(value: true | undefined) {
        this.atomic.optional &&= value
    }

    addBaseProp(attributes: Attributes) {
        if (this.composed.baseProp) {
            this.composed.baseProp.intersect(attributes.eject())
        } else {
            this.composed.baseProp = attributes
        }
    }

    addProp(key: string, attributes: Attributes) {
        if (this.composed.props?.[key]) {
            this.composed.props[key].intersect(attributes.eject())
        } else {
            this.composed.props ??= {}
            this.composed.props[key] = attributes
        }
    }

    addBranch(branch: Attributes) {
        // let k: KeyOf
        // const baseAttributesToDistribute = {} as EjectedAttributes
        // for (k in branch) {
        //     if (deepEquals(this.atomic[k], branch[k])) {
        //         // The branch attribute is redundant and can be removed.
        //         delete branch[k]
        //         continue
        //     }
        //     if (!(k in this.atomic)) {
        //         // The branch attribute was not previously part of base and is safe to push to branches.
        //         continue
        //     }
        //     // The attribute had distinct values for base and branch. Once we're
        //     // done looping over branch attributes, distribute it to each
        //     // existing branch and remove it from base.
        //     baseAttributesToDistribute[k] = this.atomic[k] as any
        // }
        // if (!Object.keys(branch).length) {
        //     // All keys were redundant, no need to push the new branch
        //     return
        // }
        // this.atomic.branches ??= []
        // // distr
        // this.atomic.branches.push(branch)
    }

    intersect(attributes: EjectedAttributes) {
        // if (attributes.baseProp) {
        //     if (this.composed.baseProp) {
        //         this.composed.baseProp.intersect(attributes.baseProp)
        //     } else {
        //         this.composed.baseProp =
        //     }
        //     this.composed.baseProp?.this.addType(attributes.typed)
        // }
    }
}

type Bounds = {
    lower?: Bound
    upper?: Bound
}

type Bound = {
    limit: number
    inclusive: boolean
}

type BoundKind = keyof Bounds

const assignIntersectionToBounds = (
    kind: BoundKind,
    base: Bounds,
    bound: Bound
): boolean => {
    const invertedKind = invertedKinds[kind]
    const baseCompeting = base?.[kind]
    const baseOpposing = base?.[invertedKind]
    if (baseOpposing && isStricter(invertedKind, bound, baseOpposing)) {
        return false
    }
    if (!baseCompeting || isStricter(kind, bound, baseCompeting)) {
        base[kind] = bound
    }
    return true
}

const invertedKinds = {
    lower: "upper",
    upper: "lower"
} as const

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

// Calculate the GCD, then divide the product by that to determine the LCM:
// https://en.wikipedia.org/wiki/Euclidean_algorithm
const leastCommonMultiple = (x: number, y: number) => {
    let previous
    let greatestCommonDivisor = x
    let current = y
    while (current !== 0) {
        previous = current
        current = greatestCommonDivisor % current
        greatestCommonDivisor = previous
    }
    return Math.abs((x * y) / greatestCommonDivisor)
}
