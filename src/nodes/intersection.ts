import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import type { mutable } from "../utils/generics.js"
import { hasKeys, isKeyOf, listFrom } from "../utils/generics.js"
import type { dict, TypeName } from "../utils/typeOf.js"
import type {
    AttributesByType,
    AttributesNode,
    BranchesOfType,
    ExtendableTypeName,
    Node,
    ReferenceNode
} from "./node.js"
import { BuiltinReference, builtinReferences } from "./node.js"
import { bigintIntersection } from "./types/bigint.js"
import { booleanIntersection } from "./types/boolean.js"
import { numberIntersection } from "./types/number.js"
import { objectIntersection } from "./types/object.js"
import { stringIntersection } from "./types/string.js"

export const intersection = (l: Node, r: Node, scope: ScopeRoot) => {
    if (l === "never" || r === "never") {
        return "never"
    }
    if (l === "any" || r === "any") {
        return "any"
    }
    if (l === "unknown") {
        return r
    }
    if (r === "unknown") {
        return l
    }
    return l
}

export type AttributesIntersection<attributes extends dict> = (
    l: attributes,
    r: attributes,
    scope: ScopeRoot
) => attributes | "never"

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
    lBranches: BranchesOfType<TypeName>,
    rBranches: BranchesOfType<TypeName>,
    scope: ScopeRoot
) =>
    lBranches.flatMap((l) =>
        rBranches.map((r) =>
            intersectionsByType[typeName](l as any, r as any, scope)
        )
    )

const nameIntersection = (
    name: ReferenceNode<dict>,
    node: Node,
    scope: ScopeRoot
) => {
    if (typeof node === "string") {
    }
}

const twoWayNameIntersection = (
    l: ReferenceNode<dict>,
    r: ReferenceNode<dict>,
    scope: ScopeRoot
) => {
    if (l === "never" || r === "never") {
        return "never"
    }
    if (!isKeyOf(l, builtinReferences)) {
        return intersection(
            scope.resolve(l),
            isKeyOf(r, builtinReferences) ? r : scope.resolve(r),
            scope
        )
    }
    if (!isKeyOf(r, builtinReferences)) {
        return intersection(l, scope.resolve(r), scope)
    }
    if (l === "any" || r === "any") {
        return
    }
}

const typeIntersection = (
    rightRoot: AttributesNode,
    leftRoot: AttributesNode,
    scope: ScopeRoot
): Node => {
    const result: mutable<AttributesNode> = {}
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
        ).filter((branch) => branch !== "never")
        if (viableBranches.length) {
            result[typeName] =
                viableBranches.length === 1
                    ? viableBranches[0]
                    : (viableBranches as any)
        }
    }
    return !hasKeys(result) ? "never" : result
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
