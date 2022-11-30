import type { ScopeRoot } from "../scope.js"
import { deepEquals } from "../utils/deepEquals.js"
import type { mutable } from "../utils/generics.js"
import { hasKeys, listFrom } from "../utils/generics.js"
import type { dict, TypeName } from "../utils/typeOf.js"
import type { IntersectableKey } from "./intersection.js"
import { intersection, intersectionsByType } from "./intersection.js"
import type { Node, TypeNode } from "./node.js"
import type { Alias } from "./types/degenerate.js"

export const union = (l: Node, r: Node, scope: ScopeRoot) => {
    // TODO: Ensure resolves to non-alias
    if (l.alias) {
        l = scope.resolve(l.alias)
    }
    if (r.alias) {
        r = scope.resolve(r.alias)
    }
    if (l.never) {
        return r
    }
    if (r.never) {
        return l
    }
    if (l.always) {
        return l.always === "any" ? l : r.always === "any" ? r : l
    }
    if (r.always) {
        return r
    }
    const result = { ...l, ...r } as mutable<TypeNode>
    let typeName: TypeName
    for (typeName in result) {
        const lValue = l[typeName]
        const rValue = r[typeName]
        if (lValue && rValue) {
            if (lValue === true || rValue === true) {
                result[typeName] = true
            } else {
                // TODO: Cartesian product
                const lBranches: dict[] = [...listFrom(lValue)]
                const rBranches = listFrom(rValue) as readonly dict[]
                for (const lBranch of lBranches) {
                    rBranches = rBranches.filter((rBranch) => {
                        const comparison = compareAttributes(
                            typeName as IntersectableKey,
                            lBranch,
                            rBranch,
                            scope
                        )
                        if (comparison === ">") {
                        }
                    })

                    for (const rBranch of rBranches) {
                        const comparison = compareAttributes(
                            typeName as IntersectableKey,
                            lBranch,
                            rBranch,
                            scope
                        )
                        if (comparison === "<=") {
                            distinctBranches.push(rBranch)
                        }
                    }
                }
            }
            result[typeName] =
                updatedAttributes.length === 1
                    ? updatedAttributes[0]
                    : (updatedAttributes as any)
        }
    }
    return result
}

// Returns, in order of precedence:
//  1.  "<=" if l extends r
//  2.  ">" if r extends  (but is not equivalent to) l
//  3.  null
const compareAttributes = (
    typeName: IntersectableKey,
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
