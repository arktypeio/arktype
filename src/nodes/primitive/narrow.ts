import type { listable } from "../../../dev/utils/src/main.js"
import { intersectUniqueLists, listFrom } from "../../../dev/utils/src/main.js"
import { registry } from "../../compile/registry.js"
import type { Narrow } from "../../parse/tuple.js"
import type { BaseNode } from "../node.js"
import { defineNodeKind } from "../node.js"

export interface NarrowNode extends BaseNode<{ rule: readonly Narrow[] }> {}

export const narrowNode = defineNodeKind<NarrowNode, listable<Narrow>>(
    {
        kind: "narrow",
        // TODO:  Preserve the relative order of narrows
        parse: listFrom,
        compile: (rule, s) =>
            rule
                .map((narrow) => {
                    const name = registry().register(narrow)
                    return s.check("custom", "?", `${name}(${s.data})`)
                })
                .join("\n"),
        intersect: (l, r): NarrowNode =>
            narrowNode(intersectUniqueLists(l.rule, r.rule))
    },
    (base) => ({
        description: `valid according to ${base.rule
            .map((narrow) => narrow.name)
            .join(", ")}`
    })
)
