import type { ScopeRoot } from "../scope.js"
import { throwInternalError } from "../utils/errors.js"
import { hasKey } from "../utils/generics.js"
import type {
    Attribute,
    Branches,
    TypeNode,
    UndiscriminatedUnion
} from "./node.js"
import { defineOperations } from "./node.js"

export const branchOperations = defineOperations<Attribute<"branches">>()({
    intersection: (a, b) => ["&", [...listUnions(a), ...listUnions(b)]],
    difference: (a, b, scope) => {
        return a
        // const unionsOfB = listUnions(b)
        // const result = listUnions(a).filter(
        //     (unionA) =>
        //         !unionA[1].every((branchA) =>
        //             unionsOfB.some((unionB) =>
        //                 unionB[1].some((branchB) =>
        //                     isSubtype(branchB, branchA, scope)
        //                 )
        //             )
        //         )
        // )
        // return result.length === 0
        //     ? undefined
        //     : result.length === 1
        //     ? result[0]
        //     : ["&", result]
    }
})

// export const compress = (uncompressed: Type[], scope: ScopeRoot) => {
//     if (uncompressed.length === 1) {
//         return uncompressed[0]
//     }
//     const branches = uncompressed.map((branch) => {
//         if (hasKey(branch, "alias")) {
//             const { alias, ...rest } = branch
//             return intersect(rest, scope.resolve(alias), scope)
//         }
//         return branch
//     })
//     let universalAttributes: Type | null = branches[0]
//     const redundantIndices: Record<number, true> = {}
//     for (let i = 0; i < branches.length; i++) {
//         if (redundantIndices[i]) {
//             continue
//         }
//         if (i > 0 && universalAttributes) {
//             universalAttributes = extract(
//                 universalAttributes,
//                 branches[i],
//                 scope
//             )
//         }
//         // TODO: Checking if subtype anyways, just do full comparison for better idea of universal attributes etc...
//         for (let j = i + 1; j < branches.length; j++) {
//             if (isSubtype(branches[i], branches[j], scope)) {
//                 redundantIndices[i] = true
//                 break
//             } else if (isSubtype(branches[j], branches[i], scope)) {
//                 redundantIndices[j] = true
//             }
//         }
//     }
//     const base = universalAttributes ?? {}
//     const compressedBranches: Type[] = []
//     for (let i = 0; i < branches.length; i++) {
//         if (redundantIndices[i]) {
//             continue
//         }
//         const uniqueBranchAttributes = universalAttributes
//             ? exclude(branches[i], universalAttributes, scope)
//             : branches[i]
//         if (uniqueBranchAttributes) {
//             compressedBranches.push(uniqueBranchAttributes)
//         }
//     }
//     const compressedUnion: UndiscriminatedUnion = ["|", compressedBranches]
//     return {
//         ...base,
//         branches: base.branches
//             ? branchOperations.intersection(base.branches, compressedUnion)
//             : compressedUnion
//     }
// }

const unexpectedDiscriminatedBranchesMessage =
    "Unexpected operation on discriminated branches"

const listUnions = (branches: Branches) =>
    branches[0] === "|"
        ? [branches]
        : branches[0] === "&"
        ? branches[1].map((intersectedBranches) =>
              intersectedBranches[0] === "?"
                  ? throwInternalError(unexpectedDiscriminatedBranchesMessage)
                  : intersectedBranches
          )
        : throwInternalError(unexpectedDiscriminatedBranchesMessage)

// export const excludeFromBranches = (
//     branches: Branches,
//     a: Type,
//     scope: ScopeRoot
// ): Branches | null => {
//     const unions = listUnions(branches)
//     const unionsWithExclusion: Type[][] = []
//     for (const union of unions) {
//         const unionWithExclusion = excludeFromUnion(union[1], a, scope)
//         if (unionWithExclusion) {
//             unionsWithExclusion.push(unionWithExclusion)
//         }
//     }
//     if (unionsWithExclusion.length === 0) {
//         return null
//     }
//     if (unionsWithExclusion.length === 1) {
//         return ["|", unionsWithExclusion[0]]
//     }
//     return ["&", unionsWithExclusion.map((union) => ["|", union] as const)]
// }

// const excludeFromUnion = (union: Type[], a: Type, scope: ScopeRoot) => {
//     for (let i = 0; i < union.length; i++) {
//         const remainingBranchAttributes = exclude(union[i], a, scope)
//         if (remainingBranchAttributes === null) {
//             // If any of the branches is empty, assign is a subtype of
//             // the branch and the branch will always be fulfilled. In
//             // that scenario, we can safely remove all branches in that set.
//             return null
//         }
//         union[i] = remainingBranchAttributes
//     }
//     return union
// }
