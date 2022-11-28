import type { ScopeRoot } from "../scope.js"
import type { mutable } from "../utils/generics.js"
import type { TypeName } from "../utils/typeOf.js"
import type { Node, ScopedPruneFn, TypeNode } from "./node.js"
import type { Never } from "./types/degenerate.js"
import {
    isDegenerate,
    pruneDegenerate,
    resolveIfAlias
} from "./types/degenerate.js"
import { pruneLiteralOnly } from "./types/literalOnly.js"
import { pruneNumber } from "./types/number.js"
import { pruneObject } from "./types/object.js"
import { pruneString } from "./types/string.js"

export const union = (branches: Node[], scope: ScopeRoot): Node => {
    const inviableBranches: Never[] = []
    const typedBranches: TypeNode[] = []
    for (const branch of branches) {
        const resolution = resolveIfAlias(branch, scope)
        if (resolution.always) {
            return branch
        }
        if (resolution.never) {
            inviableBranches.push(resolution)
            continue
        }
        typedBranches.push(resolution as any)
    }
    if (typedBranches.length === 0) {
        return {
            never: `All branches are inviable:\n${JSON.stringify(
                inviableBranches
            )}`
        }
    }
    const result: mutable<TypeNode> = {}
    for (const branch of typedBranches) {
        let typeName: TypeName
        for (typeName in branch) {
            const current = result[typeName]
            if (current === undefined) {
                result[typeName] = branch[typeName] as any
            } else if (current === true) {
                continue
            } else if (Array.isArray(current)) {
                current.push(branch[typeName])
            } else {
                result[typeName] = [result[typeName], branch[typeName]] as any
            }
        }
    }
    return result
}

export const attributePruners = {
    bigint: pruneLiteralOnly,
    boolean: pruneLiteralOnly,
    number: pruneNumber,
    object: pruneObject,
    string: pruneString
}

export const prune: ScopedPruneFn<Node> = (l, r, scope) => {
    if (isDegenerate(l) || isDegenerate(r)) {
        return pruneDegenerate(l, r, scope)
    }
    return l
}
