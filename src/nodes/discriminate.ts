import type {
    Predicate,
    TraversalCondition,
    TraversalPredicate
} from "../nodes/predicate.ts"
import type { Domain, Subdomain } from "../utils/domains.ts"

export type DiscriminatedBranches<
    rule extends DiscriminatableRule = DiscriminatableRule
> = {
    readonly path: string[]
    readonly rule: rule
    readonly cases: TraversalCases<rule>
}

export type TraversalCases<
    ruleName extends DiscriminatableRule = DiscriminatableRule
> = {
    [caseKey in DiscriminatableRules[ruleName]]?: TraversalPredicate
}

type DiscriminatableRules = {
    domain: Domain
    subdomain: Subdomain
    value: string
}

export type DiscriminatableRule = keyof DiscriminatableRules

type Discriminant = {
    path: string[]
    rule: DiscriminatableRule
    score: number
}

const discriminateBranches = (branches: TraversalCondition[]): Predicate => {
    const discriminant = greedyDiscriminant([], branches)
    if (!discriminant) {
        return branches
    }
    const cases: TraversalCases = {}
    for (let i = 0; i < branches.length; i++) {
        const value = queryPath(branches[i], discriminant.path)
        const caseKey = value ?? "default"
        cases[caseKey] ??= []
        cases[caseKey].push(
            value
                ? excludeDiscriminant(branches[i], discriminant.path, value)
                : branches[i]
        )
    }
    const cases: record<Type> = {}
    for (const value in cases) {
        cases[value] = discriminate(base, $)
    }
    return ["?", discriminant.path, cases]
}

const greedyDiscriminant = (
    path: string[],
    branches: TraversalCondition[]
): Discriminant | undefined =>
    greedyShallowDiscriminant(path, branches) ??
    greedyPropsDiscriminant(path, branches)

const greedyShallowDiscriminant = (
    path: string[],
    branches: TraversalCondition[]
): Discriminant | undefined => {
    const typeScore = disjointScore(branches, "type")
    const valueScore = disjointScore(branches, "value")
    if (typeScore || valueScore) {
        return typeScore > valueScore
            ? { path, rule: "domain", score: typeScore }
            : {
                  path,
                  rule: "domain",
                  score: valueScore
              }
    }
}

const greedyPropsDiscriminant = (
    path: string[],
    branches: TraversalCondition[]
) => {
    let bestDiscriminant: Discriminant | undefined
    const sortedPropFrequencies = sortPropsByFrequency(branches)
    for (const [propKey, branchAppearances] of sortedPropFrequencies) {
        const maxScore = maxEdges(branchAppearances)
        if (bestDiscriminant && bestDiscriminant.score >= maxScore) {
            return bestDiscriminant
        }
        const propDiscriminant = greedyDiscriminant(
            [...path, propKey],
            branches.map((branch) => branch.props?.[propKey] ?? {})
        )
        if (
            propDiscriminant &&
            (!bestDiscriminant ||
                propDiscriminant.score > bestDiscriminant.score)
        ) {
            bestDiscriminant = propDiscriminant
        }
    }
    return bestDiscriminant
}

const maxEdges = (vertexCount: number) => (vertexCount * (vertexCount - 1)) / 2

type PropFrequencyEntry = [propKey: string, appearances: number]

const sortPropsByFrequency = (
    branches: TraversalCondition[]
): PropFrequencyEntry[] => {
    const appearancesByProp: Record<string, number> = {}
    for (let i = 0; i < branches.length; i++) {
        if (!branches[i].props) {
            continue
        }
        for (const propKey in branches[i].props) {
            appearancesByProp[propKey] = appearancesByProp[propKey]
                ? appearancesByProp[propKey] + 1
                : 1
        }
    }
    return Object.entries(appearancesByProp).sort((a, b) => b[1] - a[1])
}

const disjointScore = (
    branches: TraversalCondition[],
    rule: DiscriminatableRule
) => {
    let score = 0
    for (let i = 0; i < branches.length; i++) {
        for (let j = i + 1; j < branches.length; j++) {
            if (
                branches[i][rule] &&
                branches[j][rule] &&
                branches[i][rule] !== branches[j][rule]
            ) {
                score++
            }
        }
    }
    return score
}

// export const queryPath = (root: TypeResolution, path: string[]) => {
//     let node = root
//     for (const segment of path) {
//         if (node.props?.[segment] === undefined) {
//             return undefined
//         }
//         node = node.props[segment]
//     }
//     return node[key]
// }
