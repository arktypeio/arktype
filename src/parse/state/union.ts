/* eslint-disable max-lines */
/* eslint-disable max-lines-per-function */
import { pushKey } from "../../utils/generics.js"
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
    result: DiscriminationGraph
}
type DiscriminationGraph = number[][] & {
    size: number
}

export const union = (branches: Attributes[]): Attributes => {
    const distribution: DistributionByPath = {}
    for (let i = 0; i < branches.length; i++) {
        addBranchPaths(distribution, branches[i], "", i)
    }
    const discriminantEntries = graphDiscriminants(
        distribution,
        branches.length
    )
    return {
        branches: discriminate(discriminantEntries, distribution)
    }
}

const graphDiscriminants = (
    distribution: DistributionByPath,
    branchCount: number
): Discriminant[] => {
    const discriminantEntries: Discriminant[] = []
    for (const path in distribution) {
        if (!path.endsWith("type")) {
            continue
        }
        const result: DiscriminationGraph = [] as any
        result.size = 0
        for (let i = 0; i < branchCount; i++) {
            result[i] = []
            const firstValue = distribution[path][i]
            for (let j = i - 1; j >= 0; j--) {
                const secondValue = distribution[path][j]
                if (
                    firstValue === undefined ||
                    secondValue === undefined ||
                    firstValue === secondValue
                ) {
                    result[i].push(j)
                    result.size++
                }
            }
        }
        const pathEntry: Discriminant = { path, result }
        if (result.size === 0) {
            return [pathEntry]
        }
        if (
            discriminantEntries[0] &&
            result.size < discriminantEntries[0].result.size
        ) {
            discriminantEntries.unshift(pathEntry)
        } else {
            discriminantEntries.push(pathEntry)
        }
    }
    return discriminantEntries
}

const discriminate = (
    discriminants: Discriminant[],
    distribution: DistributionByPath
): AttributeBranches | undefined => {
    const head = discriminants.shift()
    if (!head) {
        return
    }
    let currentMinCount = head.result.size
    const next: Discriminant[] = []
    for (const discriminant of discriminants) {
        discriminant.result = intersectDiscriminant(
            head.result,
            discriminant.result
        )
        if (discriminant.result.size < currentMinCount) {
            next.unshift(discriminant)
            currentMinCount = discriminant.result.size
            if (currentMinCount === 0) {
                break
            }
        } else if (discriminant.result.size < head.result.size) {
            next.push(discriminant)
        }
    }
    const branchMap: Record<string, any> = {}
    let i: NumberLiteral
    for (i in distribution[head.path]) {
        const discriminantValue = distribution[head.path][i] ?? ""
        branchMap[discriminantValue] ??= []
        branchMap[discriminantValue].push(i)
    }
    return [head.path, branchMap]
}

const b = [
    {
        type: "dictionary",
        props: { a: { type: "string" }, c: { type: "bigint" } }
    },
    {
        type: "dictionary",
        props: { a: { type: "string" }, c: { type: "number" } },
        requiredKeys: { a: true }
    },
    {
        type: "dictionary",
        props: { a: { type: "number" }, b: { type: "boolean" } }
    }
]

const pathify = (
    result: Record<string, unknown>,
    branches: Attributes[],
    path: string
) => {
    for (let i = 0; i < branches.length; i++) {
        let k: AttributeKey
        for (k in branches[i]) {
            const keyPath = pushKey(path, k)
            if (result[keyPath]) {
            }
        }
    }
    return result
}

const addBranchPaths = (
    result: DistributionByPath,
    attributes: Attributes,
    path: string,
    i: number
) => {
    let k: AttributeKey
    for (k in attributes) {
        if (k === "baseProp") {
            addBranchPaths(result, attributes[k]!, pushKey(path, "baseProp"), i)
        } else if (k === "props") {
            for (const propKey in attributes[k]) {
                addBranchPaths(
                    result,
                    attributes[k]![propKey],
                    pushKey(path, "props." + propKey),
                    i
                )
            }
        } else {
            const value = String(attributes[k])
            const pathWithKey = pushKey(path, k)
            result[pathWithKey] ??= {}
            result[pathWithKey][i] = value
        }
    }
}

const addAtPath = (o: any, path: string, value: unknown) => {}

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
