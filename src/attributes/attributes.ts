import type { Dictionary, Evaluate, JsType } from "../internal.js"
import type { Scanner } from "../parser/str/state/scanner.js"

export type Attributes = Readonly<{
    type?: JsType.NormalizedName
    value?: unknown
    // TODO: Multiple regex
    regex?: RegExp
    divisor?: number
    min?: number
    inclusiveMin?: true
    max?: number
    inclusiveMax?: true
    optional?: true
    config?: Dictionary
    branches?: Attributes[]
    props?: Dictionary<Attributes>
    values?: Attributes
}>

export namespace Attributes {
    export type Name = Evaluate<keyof Attributes>

    export const initialize = (attributes: Attributes) => attributes

    type MutableAttributes = { -readonly [k in Name]?: Attributes[k] } & {
        branches?: MutableAttributes[]
        props?: Dictionary<MutableAttributes>
        values?: MutableAttributes
    }

    export type ParamsByName = {
        type: [JsType.NormalizedName]
        value: [unknown]
        regex: [RegExp]
        divisor: [number]
        bound: [Scanner.Comparator, number]
        optional: []
        config: [Dictionary]
    }

    export type InputName = keyof ParamsByName

    export const add = <name extends InputName>(
        attributes: Attributes,
        name: name,
        ...params: ParamsByName[name]
    ) => {}

    const addRaw = <name extends Name>(
        attributes: Attributes,
        name: name,
        value: Attributes[name]
    ) => {
        // if (name === "divisor") {
        //     attributes.divisor =
        //         attributes.divisor === undefined
        //             ? value
        //             : leastCommonMultiple(value, attributes.divisor)
        // }
    }

    export const intersection = (base: Attributes, branch: Attributes) => {
        let k: Name
        for (k in branch) {
            addRaw(base, k, branch[k])
        }
        return base
    }

    // Only when union is finalized
    export const union = (externalBase: Attributes, branch: Attributes) => {
        const base = externalBase as MutableAttributes
        let k: Name
        let branchHasAUniqueAttribute = false
        for (k in branch) {
            if (base[k] === branch[k]) {
                // The branch attribute is redundant and can be removed.
                delete branch[k]
                continue
            }
            branchHasAUniqueAttribute = true
            if (!(k in base)) {
                // The branch attribute was not previously part of base and is safe to push to branches.
                continue
            }
            // The attribute had distinct values for base and branch.
            // Distribute the base value to each existing branch and remove it
            // from base.
            base.branches ??= []
            for (const existingBranch of base.branches) {
                existingBranch[k] = base[k] as any
            }
            delete base[k]
        }
        if (branchHasAUniqueAttribute) {
            base.branches ??= []
            base.branches.push(branch)
        }
        return base
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
