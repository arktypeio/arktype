import type { KindName } from "./kinds.js"
import type { Traversal } from "./traversal.js"
export type { KindName as NodeKind } from "./kinds.js"

export type Node = {
    definitionRequiresStructure: boolean
    readonly kind: KindName
    children?: Node[]

    traverse(traversal: Traversal): void

    toString(): string
    readonly description: string
    readonly ast: unknown

    /**
     * This generates an isomorphic definition that can be parsed and
     * inverted. The preferred isomorphic format for expressions is the
     * string form over the tuple form:
     *
     * Terminal => string
     * Structural => object
     * NonTerminal => Any structural descendants ? [tuple-form expression] : "string-form expression"
     *
     * For example, the input definitions...
     *
     *     "string|number" (string form)
     *         and
     *     ["string", "|", "number"] (tuple form)
     *
     * both result in a toDefinition() output of "string|number".
     *
     * However, if the input definition was:
     *
     *     [{ a: ["string", "?"] }, "&", { b: ["boolean", "?"] }]
     *
     * Since the structural (in this case object literal) definitions cannot
     * be stringified as a defininition, toDefintion() would yield:
     *
     *     [{a: "string?"}, "&", {b: "boolean?"}]
     */
    definition: unknown
}
