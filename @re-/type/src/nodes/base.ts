import type { Dictionary, NormalizedJsTypeName } from "@re-/tools"
import { chainableNoOpProxy, jsTypeOf, keySet } from "@re-/tools"
import type { DynamicArktype } from "../type.js"
import { Check } from "./traverse/check.js"

export namespace Base {
    type NodeChildren = Node<NodeChildren>[]

    export abstract class Node<Children extends NodeChildren = NodeChildren>
        implements DynamicArktype
    {
        constructor(public children: Children, public hasStructure: boolean) {}

        check(data: unknown) {
            const state = new Check.State(data)
            this.allows(state)
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

        abstract allows(state: Check.State): void

        addError(state: Check.State, context: any) {}

        abstract toString(): string
        abstract get description(): string
        abstract get checks(): string
        abstract get ast(): unknown
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

        mapChildrenToStrings(): string[] {
            return this.children.map(mapToString)
        }

        mapChildrenToDescriptions(): string[] {
            return this.children.map(mapToDescription)
        }
    }

    const mapToString = (child: Base.Node) => child.toString()

    const mapToDescription = (child: Base.Node) => child.description
}

export namespace ObjectKind {
    export type name = "object" | "array"

    export const check = <ExpectedStructure extends ObjectKind.name>(
        node: Base.Node,
        expectedStructure: ExpectedStructure,
        state: Check.State
    ): state is Check.State<
        ExpectedStructure extends "array" ? unknown[] : Dictionary
    > => {
        const actual = jsTypeOf(state.data)
        if (expectedStructure !== actual) {
            const expectedStructureDescription =
                expectedStructure === "array"
                    ? "an array"
                    : "a non-array object"
            state.addError("structure", {
                type: node,
                message: `Must be ${expectedStructureDescription}`,
                expected: expectedStructure,
                actual
            })
            return false
        }
        return true
    }

    export type Diagnostic = Check.ConfigureDiagnostic<
        Base.Node,
        {
            expected: name
            actual: NormalizedJsTypeName
        }
    >
}

export const pathToString = (path: string[]) =>
    path.length === 0 ? "/" : path.join("/")

const vowels = keySet({ a: 1, e: 1, i: 1, o: 1, u: 1 })

export const addArticle = (phrase: string) =>
    (phrase[0] in vowels ? "an " : "a ") + phrase
