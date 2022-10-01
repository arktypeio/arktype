import type { Dictionary } from "@re-/tools"
import type { Base } from "../base.js"
import { NonTerminal } from "../nonTerminal/nonTerminal.js"
import { Optional } from "../nonTerminal/unary/optional.js"
import type { Check } from "../traverse/check/check.js"
import { checkObjectKind } from "./common.js"

export namespace ObjectLiteral {
    export class Node implements Base.Node {
        constructor(public children: Base.Node[], private keys: string[]) {}

        check(state: Check.State) {
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
            state: Check.State<Dictionary>
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

        private addMissingKeyDiagnostic(
            state: Check.State<Dictionary>,
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
            state: Check.State<Dictionary>,
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

        toDefinition() {
            const result: Dictionary = {}
            for (let i = 0; i < this.children.length; i++) {
                result[this.keys[i]] = this.children[i].toDefinition()
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

    export type ExtraneousKeysDiagnostic = Check.ConfigureDiagnostic<{
        type: Node
        data: Dictionary
        enabled: boolean
        keys: string[]
    }>

    export type MissingKeyDiagnostic = Check.ConfigureDiagnostic<{
        definition: string
        key: string
    }>
}
