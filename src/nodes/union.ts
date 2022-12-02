import type { ScopeRoot } from "../scope.js"
import type { mutable } from "../utils/generics.js"
import { listFrom } from "../utils/generics.js"
import type { TypeName } from "../utils/typeOf.js"
import type { AttributesNode } from "./attributes/attributes.js"
import type { Node } from "./node.js"

export const union = (lNode: Node, rNode: Node, scope: ScopeRoot) => {
    return lNode
    // const result = { ...lNode, ...rNode } as mutable<AttributesNode>
    // let k: TypeName
    // for (k in result) {
    //     const l = lNode[k]
    //     const r = rNode[k]
    //     if (l && r) {
    //         if (l === true || r === true) {
    //             result[k] = true
    //         } else {
    //             const distinctBranches = branchesUnion(
    //                 k as ExtensibleTypeName,
    //                 listFrom(l),
    //                 listFrom(r),
    //                 scope
    //             )
    //             result[k] =
    //                 distinctBranches.length === 1
    //                     ? distinctBranches[0]
    //                     : (distinctBranches as any)
    //         }
    //     }
    // }
    // return result
}

// const branchesUnion = <TypeName extends ExtensibleTypeName>(
//     typeName: TypeName,
//     lBranches: BranchesOfType<TypeName>,
//     rBranches: BranchesOfType<TypeName>,
//     scope: ScopeRoot
// ): ResolvedBranchesOfType<TypeName> => {
//     const lResolutions = resolveBranches(typeName, lBranches, scope)
//     const rResolutions = resolveBranches(typeName, rBranches, scope)
//     return lResolutions
//         .filter((l) =>
//             rResolutions.every((r, i) => {
//                 const comparison = compareAttributes(typeName, l, r, scope)
//                 if (comparison === "<=") {
//                     return false
//                 }
//                 if (comparison === ">") {
//                     rResolutions.splice(i, 1)
//                 }
//                 return true
//             })
//         )
//         .concat(rResolutions)
// }
