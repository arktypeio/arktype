import type { listable } from "../../../dev/utils/src/main.js"
import { intersectUniqueLists, listFrom } from "../../../dev/utils/src/main.js"
import { registry } from "../../compile/registry.js"
import { compileCheck, InputParameterName } from "../../compile/state.js"
import type { Narrow } from "../../parse/tuple.js"
import type { BaseNode } from "../node.js"
import { defineNodeKind } from "../node.js"

export interface NarrowNode extends BaseNode<{ rule: readonly Narrow[] }> {}

export const narrowNode = defineNodeKind<NarrowNode, listable<Narrow>>(
    {
        kind: "narrow",
        // TODO: allow changed order to be the same type
        parse: listFrom,
        compile: (rule, ctx) =>
            rule
                .map((narrow) => {
                    const name = registry().register(narrow)
                    return compileCheck(
                        "custom",
                        "?",
                        `${name}(${InputParameterName})`,
                        ctx
                    )
                })
                .join("\n"),
        intersect: (l, r): NarrowNode =>
            // as long as the narrows in l and r are individually safe to check
            // in the order they're specified, checking them in the order
            // resulting from this intersection should also be safe.
            narrowNode(intersectUniqueLists(l.rule, r.rule))
    },
    (base) => ({
        description: `valid according to ${base.rule
            .map((narrow) => narrow.name)
            .join(", ")}`
    })
)
