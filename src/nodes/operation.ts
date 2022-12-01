import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import { throwInternalError } from "../utils/errors.js"
import type { dict } from "../utils/typeOf.js"
import { hasType } from "../utils/typeOf.js"
import { resolveIfName } from "./names.js"
import type {
    AttributesByType,
    BranchesOfType,
    ExtendableTypeName,
    Node,
    ResolutionNode
} from "./node.js"

export type NodeOperation = (l: Node, r: Node, scope: ScopeRoot) => Node

export type ResolutionOperation = (
    l: ResolutionNode,
    r: ResolutionNode,
    scope: ScopeRoot
) => ResolutionNode

export const createOperation =
    (operation: ResolutionOperation): NodeOperation =>
    (l, r, scope) => {
        const lResolution = resolveIfName(l, scope)
        const rResolution = resolveIfName(r, scope)
        const result = operation(lResolution, rResolution, scope)
        // If the operation included a name and its result is identical to the
        // original resolution of that name, return the name instead of its expanded
        // form as the result
        if (typeof l === "string" && deepEquals(result, lResolution)) {
            return l
        }
        if (typeof r === "string" && deepEquals(result, rResolution)) {
            return r
        }
        return result
    }

export type ResolvedBranchesOfType<typeName extends ExtendableTypeName> =
    AttributesByType[typeName][]

// TODO: Possible to "unresolve things that aren't changed"?
export const resolveBranches = <TypeName extends ExtendableTypeName>(
    typeName: ExtendableTypeName,
    branches: BranchesOfType<TypeName>,
    scope: ScopeRoot<dict>
): ResolvedBranchesOfType<TypeName> => {
    const resolvedBranches: ResolvedBranchesOfType<TypeName> = []
    for (const branch of branches) {
        const subBranches =
            typeof branch === "object"
                ? [branch]
                : resolveNameToBranches(typeName, branch, scope)
        for (const subBranch of subBranches) {
            resolvedBranches.push(subBranch as any)
        }
    }
    return resolvedBranches
}

const resolveNameToBranches = (
    typeName: ExtendableTypeName,
    name: string,
    scope: ScopeRoot
): dict[] => {
    const resolution = scope.resolve(name)
    if (typeof resolution === "object" && resolution[typeName]) {
        const attributeValue = resolution[typeName]!
        if (attributeValue === true) {
            // Empty attributes fulfills the expected type while acting the same as true
            return [{}]
        }
        if (typeof attributeValue === "string") {
            return resolveNameToBranches(typeName, attributeValue, scope)
        }
        if (hasType(attributeValue, "object", "dict")) {
            return [attributeValue]
        }
        return resolveBranches(typeName, attributeValue, scope)
    }
    return throwInternalError(
        `Unexpected failure to resolve '${name}' as a ${typeName}`
    )
}
