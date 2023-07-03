import { intersectUniqueLists, listFrom } from "../../../dev/utils/src/main.js"
import { InputParameterName } from "../../compile/compile.js"
import { registry } from "../../compile/registry.js"
import type { Narrow } from "../../parse/tuple.js"
import {
    type Constraint,
    definePrimitiveNode,
    type PrimitiveNode
} from "./primitive.js"

export type NarrowConstraint = Constraint<"narrow", Narrow, {}>

export interface NarrowNode
    extends PrimitiveNode<readonly NarrowConstraint[]> {}

export const narrowNode = definePrimitiveNode<NarrowNode>(
    {
        kind: "narrow",
        // TODO: allow changed order to be the same type
        parse: listFrom,
        compileRule: (rule) =>
            `${registry().register(rule)}(${InputParameterName})`,
        intersect: (l, r): NarrowNode =>
            // as long as the narrows in l and r are individually safe to check
            // in the order they're specified, checking them in the order
            // resulting from this intersection should also be safe.
            narrowNode(intersectUniqueLists(l.children, r.children))
    },
    (base) => ({
        description: `valid according to ${base.children
            .map((constraint) => constraint.rule.name)
            .join(", ")}`
    })
)
