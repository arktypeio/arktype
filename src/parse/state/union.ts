/* eslint-disable max-lines-per-function */
import type { dictionary } from "../../utils/dynamicTypes.js"
import type { mutable } from "../../utils/generics.js"
import type { NumberLiteral } from "../../utils/numericLiterals.js"
import type {
    AttributeBranches,
    AttributeKey,
    Attributes
} from "./attributes.js"

type DistributionByPath = Record<string, ValueByBranch>
type ValueByBranch = Record<number | NumberLiteral, string>
type Discriminant = {
    path: string
    key: DisjointKey
    result: DiscriminationGraph
}
type DiscriminationGraph = number[][] & {
    size: number
}

export const union = (branches: Attributes[]) => {
    return discriminate(branches)
}

const disjointKeys = {
    type: true,
    value: true
} as const

type DisjointKey = keyof typeof disjointKeys

const discriminate = (branches: Attributes[]): AttributeBranches => {
    const discriminants = graphDiscriminants(branches)
    const head = discriminants.shift()
    if (!head) {
        return branches
    }
    const branchesByValue: dictionary<Attributes[]> = {}
    for (let i = 0; i < branches.length; i++) {
        const { [head.key]: valueKey = "", ...rest } = branches[i]
        branchesByValue[valueKey] ??= []
        branchesByValue[valueKey].push(rest)
    }
    const cases: dictionary<AttributeBranches> = {}
    for (const valueKey in branchesByValue) {
        cases[valueKey] = discriminate(branchesByValue[valueKey])
    }
    return { path: head.path, key: head.key, cases }
}

const graphDiscriminants = (branches: Attributes[]) => {
    const discriminants: Discriminant[] = []
    const undiscriminatedSize = (branches.length * (branches.length - 1)) / 2
    let key: DisjointKey
    for (key in disjointKeys) {
        const current: Discriminant = {
            path: "",
            key,
            result: [] as any
        }
        current.result.size = 0
        for (let i = 0; i < branches.length - 1; i++) {
            current.result.push([])
            for (let j = i + 1; j < branches.length; j++) {
                if (
                    branches[i][key] === undefined ||
                    branches[j][key] === undefined ||
                    branches[i][key] === branches[j][key]
                ) {
                    current.result[i].push(j)
                    current.result.size++
                }
            }
        }
        if (current.result.size === 0) {
            return [current]
        }
        if (
            discriminants[0] &&
            current.result.size < discriminants[0].result.size
        ) {
            discriminants.unshift(current)
        } else if (current.result.size < undiscriminatedSize) {
            discriminants.push(current)
        }
    }
    return discriminants
}

const intersectDiscriminant = (
    undiscriminated: DiscriminationGraph,
    discriminant: DiscriminationGraph
): DiscriminationGraph => {
    const graph: DiscriminationGraph = [] as any
    graph.size = 0
    for (let i = 0; i < undiscriminated.length; i++) {
        graph[i] = []
        for (const j of undiscriminated[i]) {
            if (discriminant[i].includes(j)) {
                graph[i].push(j)
                graph.size++
            }
        }
    }
    return graph
}
