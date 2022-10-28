/* eslint-disable max-lines */ // TODO: Remove
import type { dictionary, DynamicTypeName } from "../internal.js"
import { isKeyOf } from "../internal.js"

export type Attributes<ejected extends boolean = false> = Partial<
    Attributes.Types<ejected>
>

export namespace Attributes {
    export type Key = keyof Attributes

    export type AtomicKey = keyof AtomicTypes

    export type Types<ejected extends boolean = false> = AtomicTypes &
        ComposedTypes<ejected>

    type AtomicTypes = {
        typed: DynamicTypeName
        equals: unknown
        matches: string
        divisible: number
        bounded: Bounds
        optional: true
    }

    type ComposedTypes<ejected extends boolean> = {
        baseProp: MaybeEjected<ejected>
        props: dictionary<MaybeEjected<ejected>>
        // TODO: Fix
        branches: MaybeEjected<ejected>[]
    }

    type MaybeEjected<ejected extends boolean> = ejected extends true
        ? Attributes<true>
        : Node

    export type Node = Omit<PrivateNode, IntersectionMethodName>

    export const from = (
        ...args: ConstructorParameters<typeof PrivateNode>
    ): Node => new PrivateNode(...args)
}

class PrivateNode implements AttributeIntersectionHandler {
    private contradictions?: Contradiction[]

    constructor(
        private attributes: Attributes,
        private parent?: Attributes.Node
    ) {}

    get<key extends Attributes.Key>(key: key): Readonly<Attributes[key]> {
        return this.attributes[key]
    }

    get root(): Readonly<Attributes> {
        return this.attributes
    }

    add<key extends Attributes.Key>(key: key) {
        return this.attributes[key]
    }

    intersect(attributes: Attributes) {
        let k: keyof Attributes
        for (k in attributes) {
            ;(this[`${k}Intersection`] as any)(attributes[k])
        }
        // TODO: Update branches
    }

    eject(): Attributes<true> {
        const ejected = this.attributes as Attributes<true>
        if (this.attributes.baseProp) {
            ejected.baseProp = this.attributes.baseProp.eject()
        }
        if (this.attributes.props) {
            ejected.props = {}
            for (const k in this.attributes.props) {
                ejected.props[k] = this.attributes.props[k].eject()
            }
        }
        if (this.attributes.branches) {
            ejected.branches = this.attributes.branches.map((branch) =>
                branch.eject()
            )
        }
        // TODO: Ensure not used after ejection if risk?
        return ejected
    }

    addContradiction<key extends Attributes.AtomicKey>(
        contradiction: Contradiction<key>
    ) {
        this.contradictions ??= []
        this.contradictions.push(contradiction)
    }

    equalsIntersection(value: unknown) {
        if ("equals" in this.attributes) {
            if (this.attributes.equals !== value) {
                this.addContradiction({
                    key: "equals",
                    base: this.attributes.equals,
                    intersected: value
                })
            }
        } else {
            this.attributes.equals = value
        }
    }

    typedIntersection(name: DynamicTypeName) {
        if (this.attributes.typed !== undefined) {
            if (this.attributes.typed !== name) {
                this.addContradiction({
                    key: "typed",
                    base: this.attributes.typed,
                    intersected: name
                })
            }
        } else {
            this.attributes.typed = name
            if (isKeyOf(name, literalTypes)) {
                this.equalsIntersection(literalTypes[name])
            }
        }
    }

    boundedIntersection(bounds: Bounds) {
        let updated = false
        if (bounds.lower) {
            updated = this.intersectBound("lower", bounds.lower)
        }
        if (bounds.upper) {
            updated ||= this.intersectBound("upper", bounds.upper)
        }
        return updated
    }

    intersectBound(kind: BoundKind, bound: Bound) {
        this.attributes.bounded ??= {}
        const result = intersectBound(kind, this.attributes.bounded, bound)
        if (result === "never") {
            this.addContradiction({
                key: "bounded",
                base: { [kind]: this.attributes.bounded },
                intersected: { [kind]: bound }
            })
            return false
        }
        return result
    }

    divisibleIntersection(divisor: number) {
        if (this.attributes.divisible !== undefined) {
            if (this.attributes.divisible === divisor) {
                // TODO: maybe universally check if value is === first
                return false
            }
            this.attributes.divisible = leastCommonMultiple(
                this.attributes.divisible,
                divisor
            )
        } else {
            this.attributes.divisible = divisor
            this.typedIntersection("number")
        }
        return true
    }

    matchesIntersection(expression: string) {
        return true
    }

    // TODO: Unsure how to handle for intersecting
    optionalIntersection(value: boolean) {
        return true
    }

    basePropIntersection(attributes: Attributes.Node) {
        if (this.attributes.baseProp) {
            this.attributes.baseProp.intersect(attributes.root)
        } else {
            this.attributes.baseProp = attributes
        }
    }

    propsIntersection(props: dictionary<Attributes.Node>) {
        this.attributes.props ??= {}
        for (const k in props) {
            if (this.attributes.props?.[k]) {
                this.attributes.props[k].intersect(props[k].root)
            } else {
                this.attributes.props[k] = props[k]
            }
        }
    }

    branchesIntersection(branches: AttributeNode[]) {
        return true
    }

    addBranch(branch: Attributes.Node) {
        // let k: Attributes.Key
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
}

export type Contradiction<
    key extends Attributes.AtomicKey = Attributes.AtomicKey
> = {
    key: key
    base: Attributes.Types[key]
    intersected: Attributes.Types[key]
}

type IntersectionMethodName<key extends Attributes.Key = Attributes.Key> =
    `${key}Intersection`

type IntersectionSignatureFromMethodName<
    methodName extends IntersectionMethodName<Attributes.Key>
> = methodName extends IntersectionMethodName<infer originalKey>
    ? (value: Attributes.Types[originalKey]) => any
    : never

type AttributeIntersectionHandler = {
    [methodName in IntersectionMethodName<Attributes.Key>]: IntersectionSignatureFromMethodName<methodName>
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

const intersectBound = (
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
        base[kind] = bound
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
