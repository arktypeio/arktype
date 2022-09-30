import type { Dictionary } from "@re-/tools"
import type { Base } from "../../base.js"
import type { Check, Generate } from "../../traverse/exports.js"
import { NonTerminal } from "../nonTerminal.js"
import { Optional } from "../unary/optional.js"
import { checkObjectKind } from "./common.js"

export namespace ObjectLiteral {
    export class Node extends NonTerminal.Node {
        constructor(children: Base.node[], private keys: string[]) {
            super(children)
        }

        check(state: Check.CheckState) {
            if (!checkObjectKind(this.toString(), "object", state)) {
                return
            }
            const extraneousKeys = this.checkChildrenAndGetIllegalKeys(state)
            if (extraneousKeys.length) {
                this.addExtraneousKeyDiagnostic(state, extraneousKeys)
            }
        }

        /** Returns any extraneous keys, if the options is enabled and they exist */
        private checkChildrenAndGetIllegalKeys(
            state: Check.CheckState<Dictionary>
        ): string[] {
            const rootData: any = state.data
            const uncheckedData: any = {}
            for (let i = 0; i < this.children.length; i++) {
                const k = this.keys[i]
                const child = this.children[i]
                if (k in rootData) {
                    state.path.push(k)
                    state.data = rootData[k]
                    child.check(state)
                    state.path.pop()
                } else if (!(child instanceof Optional.Node)) {
                    this.addMissingKeyDiagnostic(state, k, child.toString())
                }
                delete uncheckedData[k]
            }
            state.data = rootData
            return Object.keys(uncheckedData)
        }

        generate(state: Generate.GenerateState) {
            const result: Dictionary = {}
            for (let i = 0; i < this.children.length; i++) {
                const k = this.keys[i]
                const child = this.children[i]
                if (child instanceof Optional.Node) {
                    continue
                }
                state.path.push(k)
                result[k] = child.generate(state)
                state.path.pop()
            }
            return result
        }

        private addMissingKeyDiagnostic(
            state: Check.CheckState<Dictionary>,
            key: string,
            definition: string
        ) {
            state.errors.add(
                "missingKey",
                { reason: `${key} is required`, state },
                {
                    definition,
                    key
                }
            )
        }

        private addExtraneousKeyDiagnostic(
            state: Check.CheckState<Dictionary>,
            keys: string[]
        ) {
            const reason =
                keys.length === 1
                    ? `Key '${keys[0]}' was unexpected`
                    : `Keys '${keys.join("', '")}' were unexpected`
            state.errors.add(
                "extraneousKeys",
                { reason, state },
                {
                    definition: this.toString(),
                    data: state.data,
                    keys
                }
            )
        }

        toIsomorphicDef() {
            const result: Dictionary = {}
            for (let i = 0; i < this.children.length; i++) {
                result[this.keys[i]] = this.children[i].toIsomorphicDef()
            }
            return result
        }

        toAst() {
            const result: Dictionary = {}
            for (let i = 0; i < this.children.length; i++) {
                result[this.keys[i]] = this.children[i].toAst()
            }
            return result
        }

        toString() {
            if (!this.children.length) {
                return "{}"
            }
            let result = "{"
            let i = 0
            for (i; i < this.children.length - 1; i++) {
                result +=
                    this.keys[i] + ": " + this.children[i].toString() + ", "
            }
            // Avoid trailing comma
            return result + this.children[i].toString() + "}"
        }
    }

    export type ExtraneousKeysDiagnostic = Check.DiagnosticConfig<
        {
            definition: string
            data: Dictionary
            keys: string[]
        },
        {
            enabled: boolean
        }
    >

    export type MissingKeyDiagnostic = Check.DiagnosticConfig<{
        definition: string
        key: string
    }>
}
