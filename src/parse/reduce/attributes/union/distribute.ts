import type { Attributes, DiscriminatedBranches } from "../attributes.js"
import {
    assignAttributeIntersection,
    assignIntersection
} from "../intersection.js"
import { traverseToDiscriminant } from "./prune.js"

// export const distribute = (a: Attributes, branches: DiscriminatedBranches) => {
//     const discriminantValue = traverseToDiscriminant(
//         a,
//         branches.path,
//         branches.key
//     ).value
//     const caseKey =
//         discriminantValue && discriminantValue in branches.cases
//             ? discriminantValue
//             : "default"
//     const caseAttributes = branches.cases[caseKey]
//     if (caseAttributes) {
//         assignIntersection(a, caseAttributes)
//         delete a["branches"]
//     } else {
//         assignAttributeIntersection(
//             a,
//             "contradiction",
//             `${branches.path ? `At ${branches.path}, ` : ""}${
//                 branches.key
//             } ${discriminantValue} has no intersection with cases ${Object.keys(
//                 branches.cases
//             ).join(", ")}`
//         )
//     }
// }
