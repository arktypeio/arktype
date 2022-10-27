/* eslint-disable max-lines-per-function */
import type {
    array,
    dictionary,
    DynamicTypeName,
    Mutable
} from "../internal.js"
import { dynamicTypeOf, throwInternalError } from "../internal.js"
import type { Scanner } from "../parser/string/state/scanner.js"

declare const safe: unique symbol

type SafeProp = {
    readonly [safe]: never
}

type Safe<Type> = Type & SafeProp

export type Attributes = Safe<InternalAttributes>

type InternalAttributes = Readonly<{
    type?: Attributes.Type
    value?: unknown
    // TODO: Multiple regex
    regex?: RegExp
    divisor?: number
    min?: number
    inclusiveMin?: boolean
    max?: number
    inclusiveMax?: boolean
    optional?: boolean
    branches?: Readonly<Attributes[]>
    props?: Readonly<dictionary<Attributes>>
    values?: Attributes
}>

export namespace Attributes {
    export type Key = keyof InternalAttributes

    export type With<requiredAttributes extends InternalAttributes> =
        Safe<requiredAttributes>

    export const initEmpty = () => ({} as Attributes)

    export const init = <key extends ReducerKey>(
        key: key,
        ...args: ReducerParams[key]
    ) => reduce(key, {} as SafeProp, ...args)

    export const reduce = <key extends ReducerKey>(
        key: key,
        base: Attributes,
        ...args: ReducerParams[key]
    ) => reducers[key](base, ...args)

    const createReducers = (reducers: {
        [key in ReducerKey]: (
            base: Attributes,
            ...args: ReducerParams[key]
        ) => Attributes
    }) => reducers

    const reducers = createReducers({
        type: (base, type) =>
            base.type === type
                ? base
                : // TODO: Figure out how to help users avoid this
                  { ...base, type: base.type ? "never" : type },
        value: (base) => base,
        regex: (base) => base,
        divisor: (base, value) => ({
            ...reducers.type(base, "number"),
            divisor:
                base.divisor !== undefined
                    ? leastCommonMultiple(base.divisor, value)
                    : value
        }),
        // TODO: Adding a type here? Should be safe to check branch types.
        bound: (base, comparator, limit) => {
            if (comparator === "==") {
                if (
                    (base.max &&
                        (limit > base.max ||
                            (limit === base.max && !base.inclusiveMax))) ||
                    (base.min &&
                        (limit < base.min ||
                            (limit === base.min && !base.inclusiveMin)))
                ) {
                    return reducers.type(base, "never")
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
                Mutable<InternalAttributes>,
                "inclusiveMax" | "inclusiveMin" | "max" | "min"
            > = {}
            if (comparator === "<" || comparator === "<=") {
                if (base.max === undefined || limit < base.max) {
                    if (base.min && limit < base.min) {
                        return reducers.type(base, "never")
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
                    return reducers.type(base, "never")
                }
                return {
                    ...base,
                    ...boundAttributeUpdates
                }
            } else if (comparator === ">" || comparator === ">=") {
                if (base.min === undefined || limit > base.min) {
                    if (base.max && limit > base.max) {
                        return reducers.type(base, "never")
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
                    return reducers.type(base, "never")
                }
                return {
                    ...base,
                    ...boundAttributeUpdates
                }
            }
            return throwInternalError(`Unexpected comparator '${comparator}'.`)
        },
        optional: (base, value) =>
            base.optional === value ? base : { ...base, optional: value },
        prop: (base, key, attributes) => {
            // TODO: Should add type here?
            // TODO: Should universal props be intersected with non-universal?
            if (key === true) {
                return base.values
                    ? {
                          ...base,
                          values: reducers.intersection(base.values, attributes)
                      }
                    : attributes
            }
            // Even though externally props are readonly, internally we
            // mutate them to avoid creating many unnecessary objects.
            const mutableProps: Mutable<dictionary<Attributes>> =
                base.props ?? {}
            if (key in mutableProps) {
                return throwInternalError(
                    `Unexpectedly tried to overwrite prop '${key}'.`
                )
            }
            mutableProps[key] = attributes
            return base
        },
        union: ({ ...base }: Attributes, { ...branch }: Attributes) => {
            let k: Key
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
        },
        intersection: (base) => base
    })

    export type Type = DynamicTypeName | "never"

    type ReducerParams = {
        type: [type: Type]
        value: [value: unknown]
        regex: [value: RegExp]
        divisor: [value: number]
        bound: [comparator: Scanner.Comparator, limit: number]
        optional: [value: boolean]
        prop: [key: string | true, attributes: Attributes]
        union: [branch: Attributes]
        intersection: [branch: Attributes]
    }

    type ReducerKey = keyof ReducerParams
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
