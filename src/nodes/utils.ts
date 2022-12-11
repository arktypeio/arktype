import type { ScopeRoot } from "../scope.js"
import { filterSplit } from "../utils/filterSplit.js"
import { keysOf, listFrom } from "../utils/generics.js"
import type { TypeName } from "../utils/typeOf.js"
import { intersection } from "./intersection.js"
import type {
    UnknownConstraints,
    UnknownKeyedConstraint,
    UnknownNode,
    UnknownResolution,
    ConstraintsOf,
    TypeNode
} from "./node.js"

export const resolveIfIdentifier = (
    node: UnknownNode,
    scope: ScopeRoot
): UnknownResolution => (typeof node === "string" ? scope.resolve(node) : node)

export const nodeExtends = (node: TypeNode, base: TypeNode, scope: ScopeRoot) =>
    intersection(node, base, scope) === node

export const typeOfNode = (
    node: TypeNode,
    scope: ScopeRoot
): TypeName | TypeName[] => {
    const typeNames = keysOf(resolveIfIdentifier(node, scope))
    // TODO: Handle never here
    return typeNames.length === 1 ? typeNames[0] : typeNames
}

export type MonotypeNode<typeName extends TypeName> = {
    readonly [k in typeName]: ConstraintsOf<typeName>
}

export const nodeHasOnlyType = <typeName extends TypeName>(
    node: TypeNode,
    typeName: typeName,
    scope: ScopeRoot
): node is MonotypeNode<typeName> => typeOfNode(node, scope) === typeName

export const resolveConstraintBranches = (
    typeConstraints: UnknownConstraints,
    typeName: TypeName,
    scope: ScopeRoot
): true | UnknownKeyedConstraint[] => {
    if (typeConstraints === true) {
        return true
    }
    const [unresolved, resolved] = filterSplit(
        listFrom(typeConstraints),
        (branch): branch is string => typeof branch === "string"
    )
    while (unresolved.length) {
        const typeResolution = scope.resolveConstraints(
            unresolved.pop()!,
            typeName
        )
        if (typeResolution === true) {
            return true
        }
        for (const resolutionBranch of listFrom(typeResolution)) {
            if (typeof resolutionBranch === "string") {
                unresolved.push(resolutionBranch)
            } else {
                resolved.push(resolutionBranch)
            }
        }
    }
    return resolved
}
