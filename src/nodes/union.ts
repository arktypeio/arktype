import type { ScopeRoot } from "../scope.js"
import type { mutable } from "../utils/generics.js"
import type { TypeName } from "../utils/typeOf.js"
import type { Node, TypeNode } from "./node.js"
import type { Never } from "./types/degenerate.js"
import { resolveIfAlias } from "./types/degenerate.js"

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
