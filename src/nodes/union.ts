import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import type { mutable } from "../utils/generics.js"
import { hasKeys, listFrom } from "../utils/generics.js"
import type { dict, TypeName } from "../utils/typeOf.js"
import type { IntersectableKey } from "./intersection.js"
import { intersectionsByType } from "./intersection.js"
import type { Node, TypeNode } from "./node.js"
import type { Alias } from "./types/degenerate.js"

export const union = (branches: Node[], scope: ScopeRoot): Node => {
    const result: mutable<TypeNode> = {}
    for (const unresolved of branches) {
        // TODO: Ensure resolves to non-alias
        const branch = (
            unresolved.alias ? scope.resolve(unresolved.alias) : unresolved
        ) as Exclude<Node, Alias>
        if (branch.never) {
            continue
        }
        if (branch.always) {
            return branch.always === "any"
                ? branch
                : branches.find((branch) => branch.always === "any") ?? branch
        }
        let typeName: TypeName
        for (typeName in branch as TypeNode) {
            const existing = result[typeName]
            if (!existing) {
                result[typeName] = branch[typeName] as any
            } else if (existing === true) {
                continue
            } else if (branch[typeName] === true) {
                result[typeName] = true
            } else {
                let updatedAttributes = listFrom(existing) as dict[]
                const candidateAttributes = listFrom(branch[typeName]) as dict[]
                for (const candidate of candidateAttributes) {
                    if (
                        updatedAttributes.some((existingAttributes) =>
                            isAttributesSubtype(
                                typeName as IntersectableKey,
                                candidate,
                                existingAttributes,
                                scope
                            )
                        )
                    ) {
                        continue
                    }
                    updatedAttributes = updatedAttributes.filter(
                        (existingAttributes) =>
                            !isAttributesSubtype(
                                typeName as IntersectableKey,
                                existingAttributes,
                                candidate,
                                scope
                            )
                    )
                    updatedAttributes.push(candidate)
                }
                result[typeName] =
                    updatedAttributes.length === 1
                        ? updatedAttributes[0]
                        : (updatedAttributes as any)
            }
        }
    }
    if (!hasKeys(result)) {
        return {
            never: `no union members are satisfiable:\n${JSON.stringify(
                branches
            )}`
        }
    }
    return result
}

//** Returns true if l attributes are a subtype of r attributes for typeName */
const isAttributesSubtype = (
    typeName: IntersectableKey,
    l: dict,
    r: dict,
    scope: ScopeRoot
) =>
    deepEquals(
        l,
        intersectionsByType[typeName as IntersectableKey](
            l as any,
            r as any,
            scope
        )
    )
