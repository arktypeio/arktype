import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import type { mutable } from "../utils/generics.js"
import { hasKey, hasKeys, listFrom } from "../utils/generics.js"
import type { dict, TypeName } from "../utils/typeOf.js"
import type {
    AttributesByType,
    ExtendableTypeName,
    Node,
    TypeNode
} from "./node.js"
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

export type AttributesIntersection<attributes extends dict> = (
    l: attributes,
    r: attributes,
    scope: ScopeRoot
) => attributes | Never

const intersectionsByType: {
    [typeName in ExtendableTypeName]: AttributesIntersection<
        AttributesByType[typeName]
    >
} = {
    bigint: bigintIntersection,
    boolean: booleanIntersection,
    number: numberIntersection,
    object: objectIntersection,
    string: stringIntersection
}

// TODO: Types uppercase when generic in function, lowercase when generic in type?
export const branchesIntersection = <TypeName extends ExtendableTypeName>(
    typeName: TypeName,
    lBranches: readonly AttributesByType[TypeName][],
    rBranches: readonly AttributesByType[TypeName][],
    scope: ScopeRoot
) =>
    lBranches.flatMap((l) =>
        rBranches.map((r) =>
            intersectionsByType[typeName](l as any, r as any, scope)
        )
    )

const typeIntersection = (
    leftRoot: TypeNode,
    rightRoot: TypeNode,
    scope: ScopeRoot
): Node => {
    const result: mutable<TypeNode> = {}
    const neverResult: NeverResult = {}
    let typeName: TypeName
    for (typeName in leftRoot) {
        const l = leftRoot[typeName]
        const r = rightRoot[typeName]
        if (l === undefined || r === undefined) {
            continue
        }
        if (l === true) {
            result[typeName] = r as any
            continue
        }
        if (r === true) {
            result[typeName] = l as any
            continue
        }
        const viableBranches = branchesIntersection(
            typeName as ExtendableTypeName,
            listFrom(l),
            listFrom(r),
            scope
        ).filter((branch) => {
            if (!isNever(branch)) {
                return true
            }
            if (hasKey(neverResult, typeName)) {
                neverResult[typeName].push(branch)
            } else {
                neverResult[typeName] = [branch]
            }
            return false
        })
        if (viableBranches.length) {
            result[typeName] =
                viableBranches.length === 1
                    ? viableBranches[0]
                    : (viableBranches as any)
        }
    }
    return !hasKeys(result) ? mergeNevers(neverResult) : result
}

type NeverResult = { [k in TypeName]?: Never[] }

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

// Returns, in order of precedence:
//  1.  "<=" if l extends r
//  3.  null
//  2.  ">" if r extends  (but is not equivalent to) l
export const compareAttributes = (
    typeName: ExtendableTypeName,
    l: dict,
    r: dict,
    scope: ScopeRoot
): "<=" | ">" | null => {
    const intersected = intersectionsByType[typeName](l as any, r as any, scope)
    return deepEquals(l, intersected)
        ? "<="
        : deepEquals(r, intersected)
        ? ">"
        : null
}
