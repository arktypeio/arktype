import type { ScopeRoot } from "../scope.js"
import type { mutable } from "../utils/generics.js"
import { hasKeys, listFrom } from "../utils/generics.js"
import type { dict, TypeName } from "../utils/typeOf.js"
import type { Node, TypeNode } from "./node.js"
import { bigintIntersection } from "./types/bigint.js"
import { booleanIntersection } from "./types/boolean.js"
import type { Never } from "./types/degenerate.js"
import {
    degenerateIntersection,
    isDegenerate,
    isNever
} from "./types/degenerate.js"
import { numberIntersection } from "./types/number.js"
import { objectIntersection } from "./types/object.js"
import { stringIntersection } from "./types/string.js"

export const intersection = (l: Node, r: Node, scope: ScopeRoot) =>
    isDegenerate(l) || isDegenerate(r)
        ? degenerateIntersection(l, r, scope)
        : typeIntersection(l, r, scope)

export const intersectionsByType = {
    bigint: bigintIntersection,
    boolean: booleanIntersection,
    number: numberIntersection,
    object: objectIntersection,
    string: stringIntersection
}

export type IntersectableKey = keyof typeof intersectionsByType

type NeverResult = { [k in TypeName]?: Never[] }

const typeIntersection = (l: TypeNode, r: TypeNode, scope: ScopeRoot): Node => {
    const result: mutable<TypeNode> = {}
    const neverResult: NeverResult = {}
    let typeName: TypeName
    for (typeName in l) {
        if (!r[typeName]) {
            continue
        }
        if (l[typeName] === true) {
            result[typeName] = r[typeName] as any
        } else if (r[typeName] === true) {
            result[typeName] = l[typeName] as any
        } else {
            const viableBranches: dict[] = []
            const neverBranches: Never[] = []
            for (const lBranch of listFrom(l[typeName])) {
                for (const rBranch of listFrom(r[typeName])) {
                    const branchResult = intersectionsByType[
                        typeName as IntersectableKey
                    ](lBranch as any, rBranch as any, scope)
                    if (isNever(branchResult)) {
                        neverBranches.push(branchResult)
                    } else {
                        viableBranches.push(branchResult)
                    }
                }
            }
            if (viableBranches.length === 0) {
                neverResult[typeName] = neverBranches
            } else {
                result[typeName] =
                    viableBranches.length === 1
                        ? viableBranches[0]
                        : (viableBranches as any)
            }
        }
    }
    if (!hasKeys(result)) {
        return mergeNevers(neverResult)
    }
    return result
}

export const mergeNevers = (neverResult: NeverResult): Never => {
    let summary = ""
    let typeName: TypeName
    for (typeName in neverResult) {
        summary += `${typeName}:\n`
        for (const neverBranch of neverResult[typeName]!) {
            summary += `${neverBranch.never}\n`
        }
        summary += "\n"
    }
    return { never: summary }
}
