import type {
    AttributeBranches,
    AttributeKey,
    Attributes
} from "../../reduce/attributes/attributes.js"
import { isEmpty } from "../../utils/deepEquals.js"
import { traverseToDiscriminant } from "./prune.js"

// const distribute = (a: Attributes, branches: AttributeBranches) => {
//     if (branches[0] === "?") {
//         const [, path, key, cases] = branches
//         const discriminantValue = traverseToDiscriminant(a, path, key).value
//         const caseKey =
//             discriminantValue && discriminantValue in cases
//                 ? discriminantValue
//                 : "default"
//         const caseAttributes = cases[caseKey]
//         if (caseAttributes) {
//             return intersect(a, caseAttributes)
//         } else {
//             intersectKey(
//                 a,
//                 "contradiction",
//                 `${
//                     path ? `At ${path}, ` : ""
//                 }${key} ${discriminantValue} has no intersection with cases ${Object.keys(
//                     cases
//                 ).join(", ")}`
//             )
//         }
//     } else {
//         for (let i = 1; i < branches.length; i++) {}
//     }
// }

// // eslint-disable-next-line max-lines-per-function
// const pruneAttributes = (branch: Attributes, pruned: Attributes) => {
//     let k: AttributeKey
//     for (k in pruned) {
//         if (k === "props") {
//             if (!branch.props) {
//                 continue
//             }
//             for (const propKey in pruned.props) {
//                 if (propKey in branch.props) {
//                     pruneAttributes(
//                         branch.props[propKey],
//                         pruned.props[propKey]
//                     )
//                     if (isEmpty(branch.props[propKey])) {
//                         delete branch.props[propKey]
//                     }
//                 }
//             }
//             if (isEmpty(branch.props)) {
//                 delete branch.props
//             }
//         } else if (k === "branches") {
//             if (!branch.branches) {
//                 continue
//             }
//             // TODO: ?
//         } else {
//             if (!branch[k]) {
//                 continue
//             }
//             if (k === "divisor") {
//             }
//         }
//     }
// }
