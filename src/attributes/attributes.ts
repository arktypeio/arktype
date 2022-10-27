import type {
    array,
    dictionary,
    DynamicTypeName,
    Mutable
} from "../internal.js"
import { dynamicTypeOf } from "../internal.js"
import type { Scanner } from "../parser/str/state/scanner.js"

declare const safe: unique symbol

export type Safe<Type> = Type & {
    readonly [safe]: never
}

export type Attributes = Safe<
    Readonly<{
        type?: DynamicTypeName
        value?: unknown
        // TODO: Multiple regex
        regex?: RegExp
        divisor?: number
        min?: number
        inclusiveMin?: true
        max?: number
        inclusiveMax?: true
        optional?: boolean
        branches?: Readonly<Attributes[]>
        props?: Readonly<dictionary<Attributes>>
        values?: Attributes
    }>
>

export type AttributeKey = keyof Attributes & string

export namespace Attributes {
    export const reduce = <key extends ReducerKey>(
        attributes: Attributes,
        key: key,
        ...args: ReducerParams[key]
    ) => reducers[key](attributes, ...args)

    const type = (base: Attributes, name: DynamicTypeName) => base

    const value = (base: Attributes, value: unknown) => base

    const regex = (base: Attributes, regex: RegExp) => base

    const divisor = (base: Attributes, divisor: number) => base

    const bound = (
        base: Attributes,
        comparator: Scanner.Comparator,
        limit: number
    ) => base

    const optional = (base: Attributes, value: boolean) => base

    const prop = (
        base: Attributes,
        key: string | true,
        attributes: Attributes
    ) => base

    const union = ({ ...base }: Attributes, { ...branch }: Attributes) => {
        let k: AttributeKey
        const baseAttributesToDistribute = {} as Mutable<Attributes>
        for (k in branch) {
            if (deepEquals(base[k], branch[k])) {
                // The branch attribute is redundant and can be removed.
                delete branch[k]
                continue
            }
            if (!(k in base)) {
                // The branch attribute was not previously part of base and is safe to push to branches.
                continue
            }
            // The attribute had distinct values for base and branch. Once we're
            // done looping over branch attributes, distribute it to each
            // existing branch and remove it from base.
            baseAttributesToDistribute[k] = base[k] as any
        }
        if (!Object.keys(branch).length) {
            // All keys were redundant, no need to push the new branch
            return base
        }
        const reducedBranches =
            base.branches?.map((preexistingBranch) => ({
                ...preexistingBranch,
                ...baseAttributesToDistribute
            })) ?? []
        base.branches = [...reducedBranches, branch]
        return base
    }

    const intersection = (base: Attributes, branch: Attributes) => {
        let k: AttributeKey
        for (k in branch) {
            // Add
        }
        return base
    }

    const reducers = {
        type,
        value,
        regex,
        divisor,
        bound,
        optional,
        prop,
        union,
        intersection
    }

    type Reducers = typeof reducers

    type ReducerKey = keyof Reducers

    type ReducerParams = {
        [key in ReducerKey]: Reducers[key] extends (
            attributes: Attributes,
            ...args: infer Params
        ) => Attributes
            ? Params
            : never
    }
}

// Calculate the GCD, then divide the product by that to determine the LCM:
// https://en.wikipedia.org/wiki/Euclidean_algorithm
const leastCommonMultiple = (first: number, second: number) => {
    let previous
    let greatestCommonDivisor = first
    let current = second
    while (current !== 0) {
        previous = current
        current = greatestCommonDivisor % current
        greatestCommonDivisor = previous
    }
    return Math.abs((first * second) / greatestCommonDivisor)
}

const deepEquals = (a: unknown, b: unknown) => {
    const typeOfA = dynamicTypeOf(a)
    const typeOfB = dynamicTypeOf(b)
    return typeOfA !== typeOfB
        ? false
        : typeOfA === "dictionary"
        ? deepEqualsObject(a as dictionary, b as dictionary)
        : typeOfA === "array"
        ? deepEqualsArray(a as array, b as array)
        : a === b
}

const deepEqualsObject = (a: dictionary, b: dictionary) => {
    const unseenBKeys = { ...b }
    for (const k in a) {
        if (a[k] !== b[k]) {
            return false
        }
        delete unseenBKeys[k]
    }
    if (Object.keys(unseenBKeys).length) {
        return false
    }
    return true
}

const deepEqualsArray = (a: array, b: array) => {
    if (a.length !== b.length) {
        return false
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false
        }
    }
    return true
}
