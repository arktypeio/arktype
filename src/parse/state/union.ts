/* eslint-disable max-lines-per-function */
import type { dictionary } from "../../utils/dynamicTypes.js"
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

export const union = (branches: Attributes[]) => {
    return graphDiscriminants(branches)
}

const disjointKeys = {
    type: true,
    value: true
} as const

type DisjointKey = keyof typeof disjointKeys

const graphDiscriminants = (branches: Attributes[]) => {
    const discriminants: dictionary<DiscriminationGraph> = {}
    for (let i = 0; i < branches.length; i++) {
        for (let j = i + 1; j < branches.length; j++) {
            let k: DisjointKey
            for (k in disjointKeys) {
                if (!branches[i][k]) {
                    continue
                }
                const result: DiscriminationGraph = branches.map(
                    () => []
                ) as any
                result.size = 0

                if (
                    branches[j][k] === undefined ||
                    branches[j][k] === branches[i][k]
                ) {
                    result[i].push(j)
                    result.size++
                }
                discriminants[k] = result
            }
        }
        // // if (result.size === 0) {
        // //     return [pathEntry]
        // // }
        // if (
        //     discriminants[0] &&
        //     result.size < discriminants[0].result.size
        // ) {
        //     discriminants.unshift(pathEntry)
        // } else {
        //     discriminants.push(pathEntry)
        // }
    }
    return discriminants
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
