import type { Domain } from "../../utils/domains.js"
import { type Constructor, getBaseDomainKeys } from "../../utils/objectKinds.js"
import type { Key } from "../../utils/records.js"
import type { CompilationState } from "../compilation.js"
import { In } from "../compilation.js"
import { Disjoint } from "../disjoint.js"
import { defineNode } from "../node.js"
import { BasisLevel, BasisNode } from "./basis.js"

export class DomainNode extends defineNode<Domain>()({
    kind: "basis",
    condition: (domain) =>
        domain === "object"
            ? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
            : `typeof ${In} === "${domain}"`,
    describe: (domain) => domain,
    // TODO: don't
    intersect: (l, r) => l
}) {}

// getConstructor(): Constructor | undefined {
//     return this.child === "object"
//         ? Object(this.child).constructor
//         : undefined
// }

// literalKeysOf(): Key[] {
//     return getBaseDomainKeys(this.child)
// }

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("domain", this.child))
// }
