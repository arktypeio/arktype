import type { ScopeRoot } from "../scope.js"
import { keysOf } from "../utils/generics.js"
import type { TypeName } from "../utils/typeOf.js"
import { intersection } from "./intersection.js"
import type { BaseNode, BaseResolution, ConstraintsOf, Node } from "./node.js"

export const resolveIfIdentifier = (
    node: BaseNode,
    scope: ScopeRoot
): BaseResolution => (typeof node === "string" ? scope.resolve(node) : node)

export const nodeExtends = (node: Node, base: Node, scope: ScopeRoot) =>
    intersection(node, base, scope) === node

export const typeOfNode = (
    node: Node,
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
    node: Node,
    typeName: typeName,
    scope: ScopeRoot
): node is MonotypeNode<typeName> => typeOfNode(node, scope) === typeName
