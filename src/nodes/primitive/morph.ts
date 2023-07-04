import type { listable } from "../../../dev/utils/src/main.js"
import { intersectUniqueLists, listFrom } from "../../../dev/utils/src/main.js"
import { InputParameterName } from "../../compile/compile.js"
import { registry } from "../../compile/registry.js"
import type { Morph } from "../../parse/tuple.js"
import type { BaseNode } from "../node.js"
import { defineNode } from "../node.js"

// export interface MorphNode
//     extends BaseNode<{ kind: "morph"; children: readonly Morph[] }> {}

// export const morphNode = defineNodeKind<MorphNode, listable<Morph>>(
//     {
//         kind: "morph",
//         // Avoid alphabetical sorting since morphs are non-commutative,
//         // i.e. a=>b and b=>a are distinct and valid
//         parse: listFrom,
//         compile: (rule, ctx) => {
//             const compiled = rule.map((morph) => {
//                 const reference = registry().register(morph)
//                 return `${InputParameterName} = ${reference}(${InputParameterName})`
//             })
//             return ctx.successKind === "out"
//                 ? `morphs.push(() => {
//                     ${compiled}
//                 })`
//                 : // we don't run morphs on allows checks so for now just add this as a comment
//                   `/**${compiled.join("")}**/`
//         },
//         intersect: (l, r): MorphNode =>
//             morphNode(intersectUniqueLists(l.children, r.children))
//     },
//     (base) => ({
//         description: `morphed by ${base.children
//             .map((morph) => morph.name)
//             .join("=>")}`
//     })
// )
