import { chainableNoOpProxy, toString } from "@arktype/tools"
import type { DynamicArktype } from "../type.js"
import type { Keyword } from "./terminal/keyword/keyword.js"
import type { Traversal } from "./traversal/traversal.js"
import { initializeTraversal } from "./traversal/traversal.js"

export namespace Base {
    export abstract class Node implements DynamicArktype {
        abstract definitionRequiresStructure: boolean
        abstract readonly kind: string //NodeKind

        check(data: unknown) {
            const state = initializeTraversal(data)
            this.traverse(state)
            return state.errors.length
                ? {
                      errors: state.errors
                  }
                : { data }
        }

        assert(data: unknown) {
            const result = this.check(data)
            result.errors?.throw()
            return result.data
        }

        get infer() {
            return chainableNoOpProxy
        }

        readonly precondition?: Base.Node

        traverse(state: Traversal) {
            if (this.precondition?.allows(state.data) === false) {
                return false
            }
            const allowed = this.allows(state.data as InferPrecondition<this>)
            if (!allowed) {
                if (allowed === false) {
                    state.errors.push()
                } else {
                    this.next(state)
                }
            }
        }

        protected abstract allows(
            data: InferPrecondition<this>
        ): boolean | undefined

        abstract next(state: Traversal): void

        abstract toString(): string
        abstract readonly mustBe: string
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

    type InferPrecondition<node extends Node> = node["precondition"] extends {
        definition: Keyword.Definition
    }
        ? Keyword.Infer<node["precondition"]["definition"]>
        : unknown
}

export const pathToString = (path: string[]) =>
    path.length === 0 ? "/" : path.join("/")

export const stringifyData = (data: unknown) =>
    toString(data, {
        maxNestedStringLength: 50
    })
