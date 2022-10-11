import type { Dictionary, NormalizedJsTypeName } from "@re-/tools"
import { chainableNoOpProxy, jsTypeOf, toString } from "@re-/tools"
import type { DynamicArktype } from "../type.js"
import { Check } from "./traverse/check.js"

export namespace Base {
    export abstract class Node implements DynamicArktype {
        constructor(public children: Node[], public hasStructure: boolean) {}

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
        abstract toAst(): unknown
        abstract toString(): string
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
        abstract toDefinition(): unknown
    }
}

export namespace Structure {
    export type Kind = "object" | "array"

    export const checkKind = <ExpectedStructure extends Structure.Kind>(
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
            expected: Kind
            actual: NormalizedJsTypeName
        }
    >
}

export const pathToString = (path: string[]) =>
    path.length === 0 ? "/" : path.join("/")

export const stringifyData = (data: unknown) =>
    toString(data, {
        maxNestedStringLength: 50
    })

export const shallowClone = (data: unknown) => {
    if (typeof data === "object" && data !== null) {
        return Array.isArray(data) ? [...data] : { ...data }
    }
    return data
}
