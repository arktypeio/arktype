/* eslint-disable max-lines */
import type { dictionary, DynamicTypeName } from "../internal.js"
import { isKeyOf } from "../internal.js"
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

type ComposedAttributeTypes<ejected extends boolean> = {
    baseProp: MaybeEjectedAttributes<ejected>
    props: dictionary<MaybeEjectedAttributes<ejected>>
    // Fix
    branches: MaybeEjectedAttributes<ejected>[]
}

type ComposedAttributes<ejected extends boolean> = Partial<
    ComposedAttributeTypes<ejected>
>

type AttributeTypes<ejected extends boolean> = AtomicAttributeTypes &
    ComposedAttributeTypes<ejected>

export type UnejectedAttributes = AtomicAttributes & ComposedAttributes<false>

export type EjectedAttributes = AtomicAttributes & ComposedAttributes<true>

export type AttributeKey = keyof EjectedAttributes

export type Contradiction<key extends AtomicKey = AtomicKey> = {
    key: key
    base: AtomicAttributeTypes[key]
    intersection: AtomicAttributeTypes[key]
}

export class Attributes {
    private contradictions?: Contradiction[]

    constructor(
        public attributes: Readonly<UnejectedAttributes> = {},
        private parent?: Attributes
    ) {}

    eject(): EjectedAttributes {
        const ejectedComposed: ComposedAttributes<true> = {}
        if (this.attributes.baseProp) {
            ejectedComposed.baseProp = this.attributes.baseProp.eject()
        }
        if (this.attributes.props) {
            ejectedComposed.props = {}
            for (const k in this.attributes.props) {
                ejectedComposed.props[k] = this.attributes.props[k].eject()
            }
        }
        if (this.attributes.branches) {
            ejectedComposed.branches = this.attributes.branches.map((branch) =>
                branch.eject()
            )
        }
        return Object.assign(this.attributes, ejectedComposed)
    }

    addContradiction<key extends AtomicKey>(
        key: key,
        base: AtomicAttributes[key],
        intersection: AtomicAttributes[key]
    ) {
        this.contradictions ??= []
        this.contradictions.push({ key, base, intersection })
    }

    get equals() {
        return this.attributes.equals
    }

    addEquality(value: unknown) {
        if ("equals" in this.attributes) {
            if (this.attributes.equals !== value) {
                this.addContradiction("equals", this.attributes.equals, value)
            }
        } else {
            this.intersect({ equals: value })
        }
    }

    get typed() {
        return this.attributes.typed
    }

    addType(name: DynamicTypeName) {
        if (this.attributes.typed !== undefined) {
            if (this.attributes.typed !== name) {
                this.addContradiction("typed", this.attributes.typed, name)
            }
        } else {
            this.intersect(
                isKeyOf(name, literalTypes)
                    ? { typed: name, equals: literalTypes[name] }
                    : { typed: name }
            )
        }
    }

    get bounded() {
        return this.attributes.bounded
    }

    addBounds(bounds: Bounds) {
        if (this.attributes.bounded !== undefined) {
            let baseWithPossibleUpdates = this.attributes.bounded
            let updateLower = false
            let updateUpper = false
            if (bounds.lower) {
                updateLower = this.shouldUpdateBound(
                    "lower",
                    baseWithPossibleUpdates,
                    bounds.lower
                )
                if (updateLower) {
                    baseWithPossibleUpdates.lower = bounds.lower
                }
            }
            if (bounds.upper) {
                updateUpper = this.shouldUpdateBound(
                    "upper",
                    baseWithPossibleUpdates,
                    bounds.upper
                )
                if (updateUpper) {
                    baseWithPossibleUpdates.upper = bounds.upper
                }
            }
            if (updateLower || updateUpper) {
                this.intersect({ bounded: baseWithPossibleUpdates })
            }
        } else {
            // TODO: Add type
            this.intersect({ bounded: bounds })
        }
    }

    private shouldUpdateBound(kind: BoundKind, base: Bounds, bound: Bound) {
        const shouldUpdate = shouldUpdateBound(kind, base, bound)
        if (shouldUpdate === "never") {
            this.addContradiction(
                "bounded",
                { [kind]: this.attributes.bounded },
                { [kind]: bound }
            )
            return false
        }
        return shouldUpdate
    }

    get divisible() {
        return this.attributes.divisible
    }

    addDivisor(divisor: number) {
        if (this.attributes.divisible !== undefined) {
            this.attributes.divisible = leastCommonMultiple(
                this.attributes.divisible,
                divisor
            )
        } else {
            this.attributes.divisible = divisor
            this.addType("number")
        }
    }

    get optional() {
        return this.attributes.optional
    }

    addOptional(value: true | undefined) {
        this.attributes.optional &&= value
    }

    get baseProp() {
        return this.attributes.baseProp
    }

    addBaseProp(attributes: Attributes) {
        if (this.attributes.baseProp) {
            this.attributes.baseProp.intersect(attributes.eject())
        } else {
            this.attributes.baseProp = attributes
        }
    }

    get props() {
        return this.attributes.props
    }

    addProp(key: string) {
        if (this.attributes.props?.[key]) {
            this.attributes.props[key].intersect(attributes.eject())
        } else {
            this.attributes.props ??= {}
            this.attributes.props[key] = attributes
        }
    }

    addBranch(branch: Attributes) {
        // let k: AttributeKey
        // const baseAttributesToDistribute: EjectedAttributes = {}
        // for (k in branch) {
        //     if (!isKeyOf(k, this.atomic)) {
        //         // The branch attribute was not previously part of base and is safe to push to branches.
        //         continue
        //     }
        //     if (deepEquals(this.atomic[k], branch[k])) {
        //         // The branch attribute is redundant and can be removed.
        //         delete branch[k]
        //     } else {
        //         // The attribute had distinct values for base and branch. Once we're
        //         // done looping over branch attributes, distribute it to each
        //         // existing branch and remove it from base.
        //         baseAttributesToDistribute[k] = this.atomic[k] as any
        //     }
        // }
        // if (!Object.keys(branch).length) {
        //     // All keys were redundant, no need to push the new branch
        //     return
        // }
        // this.attributes.branches ??= []
        // for (const branch of this.attributes.branches) {
        //     branch.intersect(baseAttributesToDistribute)
        // }
        // this.attributes.branches.push(branch)
    }

    intersect(attributes: UnejectedAttributes) {
        attributes.bounded?.lower &&
            this.addBound("lower", attributes.bounded.lower)
        attributes.bounded?.upper &&
            this.addBound("upper", attributes.bounded.upper)
        attributes.baseProp && this.addBaseProp(attributes.baseProp)
        if (attributes.props) {
            for (const k in attributes.props) {
                this.addProp(k, attributes.props[k])
            }
        }
    }
}

const literalTypes = {
    undefined,
    null: null
} as const

type Bounds = {
    lower?: Bound
    upper?: Bound
}

type Bound = {
    limit: number
    inclusive: boolean
}

type BoundKind = keyof Bounds

const shouldUpdateBound = (
    kind: BoundKind,
    base: Bounds,
    bound: Bound
): boolean | "never" => {
    const invertedKind = invertedKinds[kind]
    const baseCompeting = base?.[kind]
    const baseOpposing = base?.[invertedKind]
    if (baseOpposing && isStricter(invertedKind, bound, baseOpposing)) {
        return "never"
    }
    if (!baseCompeting || isStricter(kind, bound, baseCompeting)) {
        return true
    }
    return false
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
