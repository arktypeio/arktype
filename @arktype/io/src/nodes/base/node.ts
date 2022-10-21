import type { KindName, Kinds } from "./kinds.js"
import type { Traversal } from "./traversal.js"
export type { KindName as NodeKind } from "./kinds.js"

export abstract class Node {
    abstract children?: Node[]

    abstract readonly kind: KindName

    hasKind<Name extends KindName>(name: Name): this is Kinds[Name] {
        return this.kind === name
    }

    hasKindIn<Names extends KindName>(
        names: Record<Names, unknown>
    ): this is Kinds[Names] {
        return this.kind in names
    }

    abstract definitionRequiresStructure: boolean

    abstract traverse(traversal: Traversal): void

    abstract toString(): string
    abstract readonly description: string
    abstract readonly ast: unknown

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
    abstract definition: unknown
}
