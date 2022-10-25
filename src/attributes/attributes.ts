import type { Dictionary, Evaluate, JsType } from "../internal.js"
import type { Comparator } from "../parser/str/operator/bound/comparator.js"

type Atomic = {
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
}

type Composed = {
    branches?: Attributes[]
    props?: Dictionary<Attributes>
    values?: Attributes
}

export type Attributes = Atomic & Composed

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

// export type EntriesOf<o extends object> =
//     <
//         {
//             [k in keyof o]: [k, o[k]]
//         }[keyof o]
//     >

export type EntryOf<T> = Evaluate<
    Required<{ [K in keyof T]: [K, T[K]] }>[T extends unknown[]
        ? keyof T & number
        : keyof T]
>

export type EntriesOf<T> = EntryOf<T>[]

type Z = EntriesOf<Attributes>

export namespace Attributes {
    export type Name = keyof Attributes

    export type ParamsByName = {
        type: [JsType.NormalizedName]
        value: [unknown]
        regex: [RegExp]
        divisor: [number]
        bound: [Comparator.Token, number]
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
        if (name === "divisor") {
            attributes.divisor =
                attributes.divisor === undefined
                    ? value
                    : leastCommonMultiple(value, attributes.divisor)
        }
    }

    export const addProp = (attributes: Attributes, key: string | number) => {
        if (!attributes.props) {
            attributes.props = {}
        }
        if (!attributes.props[key]) {
            attributes.props[key] = {}
        }
        return attributes.props[key]
    }
    // "string|number"

    const root = { type: "string" }

    export const intersectionOf = (left: Attributes, right: Attributes) => {
        for (const [name, value] of Object.entries(right)) {
            addRaw(left, name, value)
        }
    }

    // Only when union is finalized
    export const unionOf = (base: Attributes, branch: Attributes) => {
        let branchAttributes
        const branchAttributeEntries = Object.entries(
            branch
        ) as EntriesOf<Attributes>
        for (const [name, value] of branchAttributeEntries) {
            if (base[name] === value) {
                continue
            }
            if (name in base) {
                base.branches ||= []
                for (const branch of base.branches) {
                    branch[name] = base[name]
                }
                delete base[name]
            }
            branchAttributes ||= {} as Attributes
            branchAttributes[name] = value
        }
        if (branchAttributes) {
            base.branches ||= []
            base.branches.push(branchAttributes)
        }
    }
}
