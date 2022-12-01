import type { ScopeRoot } from "../scope.js"
import type { mutable } from "../utils/generics.js"
import { listFrom } from "../utils/generics.js"
import type { dict, TypeName } from "../utils/typeOf.js"
import { compareAttributes } from "./intersection.js"
import type { ExtendableTypeName, Node, ResolutionNode } from "./node.js"

export const union = (l: Node, r: Node, scope: ScopeRoot) => {
    if (typeof l === "string") {
    }
    return l
    // const result = { ...l, ...r } as mutable<TypeNode>
    // let typeName: TypeName
    // for (typeName in result) {
    //     const lValue = l[typeName]
    //     const rValue = r[typeName]
    //     if (lValue && rValue) {
    //         if (lValue === true || rValue === true) {
    //             result[typeName] = true
    //         } else {
    //             const rBranches: dict[] = [...listFrom(rValue)]
    //             const distinctBranches = listFrom(lValue as dict | dict[])
    //                 .filter((l) =>
    //                     rBranches.every((r, i) => {
    //                         const comparison = compareAttributes(
    //                             typeName as ExtendableTypeName,
    //                             l,
    //                             r,
    //                             scope
    //                         )
    //                         if (comparison === "<=") {
    //                             return false
    //                         }
    //                         if (comparison === ">") {
    //                             rBranches.splice(i, 1)
    //                         }
    //                         return true
    //                     })
    //                 )
    //                 .concat(rBranches)
    //             result[typeName] =
    //                 distinctBranches.length === 1
    //                     ? distinctBranches[0]
    //                     : (distinctBranches as any)
    //         }
    //     }
    // }
    // return result
}
