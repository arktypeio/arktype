import type {
    array,
    dictionary,
    DynamicTypeName,
    DynamicTypes
} from "../internal.js"
import { dynamicTypeOf, hasDynamicType } from "../internal.js"
import type { Scanner } from "../parser/str/state/scanner.js"

export type Attributes = {
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
    branches?: Attributes[]
    props?: Record<string, Attributes>
    values?: Attributes
}

export type AttributeKey = keyof Attributes

type AttributeReducers = {
    type: [name: DynamicTypeName]
    value: [unknown]
    regex: [RegExp]
    divisor: [number]
    bound: [comparator: Scanner.Comparator, limit: number]
    optional: [boolean]
    prop: [key: string | true, node: AttributeNode]
    intersection: [node: AttributeNode]
    union: [node: AttributeNode]
}

type ReducerName = keyof AttributeReducers

type DeepImmutableAttributes = {
    readonly [k in AttributeKey]?: Attributes[k]
} & {
    branches?: DeepImmutableAttributes[]
    props?: dictionary<DeepImmutableAttributes>
    values?: DeepImmutableAttributes
}

export class AttributeNode<
    knownAttributes extends DeepImmutableAttributes = DeepImmutableAttributes
> {
    private attributes = {} as knownAttributes

    static from<name extends ReducerName>(
        name: name,
        ...args: AttributeReducers[name]
    ) {
        const node = new AttributeNode()
        node.reduce(name, ...args)
        return node
    }

    get<key extends AttributeKey>(key: key): knownAttributes[key] {
        return this.attributes[key]
    }

    reduce<name extends ReducerName>(
        name: name,
        ...args: AttributeReducers[name]
    ) {
        return this
    }

    // TODO: Make the object unusable after this
    eject() {
        return this.attributes
    }

    flatten() {
        return []
    }

    private reduceIntersection(node: AttributeNode) {
        const branch = node.eject()
        let k: AttributeKey
        for (k in branch) {
            // addRaw(base, k, branch[k])
        }
    }

    private reduceUnion(node: AttributeNode) {
        const branch = node.eject()
        let k: AttributeKey
        let branchHasAUniqueAttribute = false
        for (k in branch) {
            if (deepEquals(this.attributes[k], branch[k])) {
                // The branch attribute is redundant and can be removed.
                delete branch[k]
                continue
            }
            branchHasAUniqueAttribute = true
            if (!(k in this.attributes)) {
                // The branch attribute was not previously part of this.attributes and is safe to push to branches.
                continue
            }
            // The attribute had distinct values for this.attributes and branch.
            // Distribute the this.attributes value to each existing branch and remove it
            // from this.attributes.
            this.attributes.branches ??= []
            for (const existingBranch of this.attributes.branches) {
                existingBranch[k] = this.attributes[k] as any
            }
            delete this.attributes[k]
        }
        if (branchHasAUniqueAttribute) {
            this.attributes.branches ??= []
            this.attributes.branches.push(branch)
        }
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
