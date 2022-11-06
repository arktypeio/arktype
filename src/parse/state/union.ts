/* eslint-disable max-lines-per-function */
import type { dictionary } from "../../utils/dynamicTypes.js"
import type {
    AttributeBranches,
    Attributes,
    DisjointKey
} from "./attributes.js"
import { disjointKeys } from "./attributes.js"

type Discriminant = {
    key: DisjointKey
    result: DiscriminationGraph
}

type DiscriminantEntry = [path: string, discriminant: Discriminant]

type DiscriminationGraph = number[][] & {
    size: number
}

export const discriminate = (branches: Attributes[]): AttributeBranches => {
    const discriminants = graphDiscriminants(branches)
    const head = discriminants.shift()
    if (!head) {
        return branches
    }
    const branchesByValue: dictionary<Attributes[]> = {}
    for (let i = 0; i < branches.length; i++) {
        const { [head.key]: value = "default", paths, ...rest } = branches[i]
        branchesByValue[value] ??= []
        branchesByValue[value].push(rest)
    }
    const cases: dictionary<Attributes> = {}
    for (const value in branchesByValue) {
        const branches = branchesByValue[value]
        cases[value] =
            branches.length === 1
                ? branches[0]
                : { branches: discriminate(branches) }
    }
    return { path: head.path, key: head.key, cases }
}

const graphDiscriminants = (branches: Attributes[]) => {
    const discriminants: Discriminant[] = []
    if (branches.length === 1) {
        return discriminants
    }
    const undiscriminatedSize = (branches.length * (branches.length - 1)) / 2
    let key: DisjointKey
    for (key in disjointKeys) {
        const current: Discriminant = {
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
