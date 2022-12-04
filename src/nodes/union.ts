import type { ScopeRoot } from "../scope.js"
import { listFrom } from "../utils/generics.js"
import { pathToSegments } from "../utils/paths.js"
import type { array, dict } from "../utils/typeOf.js"
import { hasType } from "../utils/typeOf.js"
import { intersection } from "./intersection.js"
import type { Attributes, NameNode, Node } from "./node.js"

export type Branches = UndiscriminatedBranches

export type UndiscriminatedBranches = array<NameNode | Attributes>

type DiscriminantKey = "type" | "literal" | "subtype"

export type DiscriminantPath<k extends DiscriminantKey> = k | `${string}.${k}`

export type DiscriminatedBranches<k extends DiscriminantKey> = [
    "?",
    DiscriminantPath<k>
]

export const union = (lNode: Node, rNode: Node, scope: ScopeRoot): Node => {
    const lBranches = listFrom(lNode)
    const rBranches = [...listFrom(rNode)]
    const result = lBranches
        .filter((l) => {
            const booleanLiteral = getPossibleBooleanLiteral(l)
            if (booleanLiteral) {
                const oppositeLiteral =
                    booleanLiteral === "true" ? "false" : "true"
                for (let i = 0; i < rBranches.length; i++) {
                    if (
                        getPossibleBooleanLiteral(rBranches[i]) ===
                        oppositeLiteral
                    ) {
                        rBranches[i] = "boolean"
                        return false
                    }
                }
                return true
            }
            return rBranches.every((r, i) => {
                const intersectionResult = intersection(l, r, scope)
                if (intersectionResult === l) {
                    // l is a subtype of r (don't include it)
                    return false
                }
                if (intersectionResult === r) {
                    // r is a subtype of l (don't include it)
                    rBranches.splice(i, 1)
                }
                return true
            })
        })
        .concat(rBranches)
    return result.length === 0
        ? "never"
        : result.length === 1
        ? result[0]
        : result
}

const getPossibleBooleanLiteral = (node: Node): "true" | "false" | undefined =>
    node === "true"
        ? "true"
        : node === "false"
        ? "false"
        : hasType(node, "object", "dict") &&
          node.type === "boolean" &&
          node.literal
        ? `${node.literal}`
        : undefined

export const compile = (attributes: Node, scope: ScopeRoot): Node => {
    const compiled = discriminate(attributes, scope)
    if (attributes.props) {
        for (const k in attributes.props) {
            compile(attributes.props[k], scope)
        }
    }
    return compiled
}

export const queryPath = (attributes: Node, path: string) => {
    const segments = pathToSegments(path)
    let currentAttributes = attributes
    for (const segment of segments) {
        if (currentAttributes.props?.[segment] === undefined) {
            return undefined
        }
        currentAttributes = currentAttributes.props[segment]
    }
    return currentAttributes[key]
}

export type DiscriminatedKey = "type" | "value"

export type DiscriminatedPath = AttributePath<DiscriminatedKey>

type Discriminant = {
    path: DiscriminatedPath
    score: number
}

export const discriminate = (base: Type, scope: ScopeRoot): Type =>
    base.branches
        ? {
              ...base,
              branches: [
                  base.branches[0],
                  base.branches[0] === "|"
                      ? discriminateBranches(base.branches[1], scope)
                      : base.branches[0] === "&"
                      ? base.branches[1].map((intersectedUnion) =>
                            intersectedUnion[0] === "|"
                                ? discriminateBranches(
                                      intersectedUnion[1],
                                      scope
                                  )
                                : throwInternalError(
                                      unexpectedRediscriminationMessage
                                  )
                        )
                      : throwInternalError(unexpectedRediscriminationMessage)
              ] as Branches
          }
        : base

const unexpectedRediscriminationMessage =
    "Unexpected attempt to rediscriminated branches"

const discriminateBranches = (
    branches: Branches,
    scope: ScopeRoot
): Branches => {
    const discriminant = greedyDiscriminant("", branches)
    if (!discriminant) {
        return ["|", branches]
    }
    const branchesByValue: dict<Branches> = {}
    for (let i = 0; i < branches.length; i++) {
        const value = queryAttribute(branches[i], discriminant.path)
        const caseKey = value ?? "default"
        branchesByValue[caseKey] ??= []
        branchesByValue[caseKey].push(
            value
                ? excludeDiscriminant(
                      branches[i],
                      discriminant.path,
                      value,
                      scope
                  )
                : branches[i]
        )
    }
    const cases: record<Type> = {}
    for (const value in branchesByValue) {
        const base: Type = compress(branchesByValue[value], scope)
        cases[value] = discriminate(base, scope)
    }
    return ["?", discriminant.path, cases]
}

const greedyDiscriminant = (
    path: string,
    branches: Branches
): Discriminant | undefined =>
    greedyShallowDiscriminant(path, branches) ??
    greedyPropsDiscriminant(path, branches)

const greedyShallowDiscriminant = (
    path: string,
    branches: Branches
): Discriminant | undefined => {
    const typeScore = disjointScore(branches, "type")
    const valueScore = disjointScore(branches, "value")
    if (typeScore || valueScore) {
        return typeScore > valueScore
            ? { path: finalizeDiscriminantPath(path, "type"), score: typeScore }
            : {
                  path: finalizeDiscriminantPath(path, "value"),
                  score: valueScore
              }
    }
}

const greedyPropsDiscriminant = (path: string, branches: Type[]) => {
    let bestDiscriminant: Discriminant | undefined
    const sortedPropFrequencies = sortPropsByFrequency(branches)
    for (const [propKey, branchAppearances] of sortedPropFrequencies) {
        const maxScore = maxEdges(branchAppearances)
        if (bestDiscriminant && bestDiscriminant.score >= maxScore) {
            return bestDiscriminant
        }
        const propDiscriminant = greedyDiscriminant(
            pushKey(path, propKey),
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

const sortPropsByFrequency = (branches: Type[]): PropFrequencyEntry[] => {
    const appearancesByProp: record<number> = {}
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

const disjointScore = (branches: Type[], key: DiscriminatedKey) => {
    let score = 0
    for (let i = 0; i < branches.length; i++) {
        for (let j = i + 1; j < branches.length; j++) {
            if (
                branches[i][key] &&
                branches[j][key] &&
                branches[i][key] !== branches[j][key]
            ) {
                score++
            }
        }
    }
    return score
}

const finalizeDiscriminantPath = (path: string, key: DiscriminatedKey) =>
    path ? (`${path}.${key}` as const) : key
