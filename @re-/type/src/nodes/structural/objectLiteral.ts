import type { Dictionary } from "@re-/tools"
import type { Base } from "../base.js"
import { Optional } from "../nonTerminal/optional.js"
import type { Check } from "../traverse/check/check.js"
import { Structural } from "./common.js"

export namespace ObjectLiteral {
    export class Node implements Base.Node {
        constructor(public children: Base.Node[], private keys: string[]) {}

        check(state: Check.State) {
            if (!Structural.checkObjectKind(this, "object", state)) {
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
                    this.addMissingKeyDiagnostic(state, k)
                }
                delete uncheckedData[k]
            }
            state.data = rootData
            return Object.keys(uncheckedData)
        }

        private addMissingKeyDiagnostic(
            state: Check.State<Dictionary>,
            key: string
        ) {
            state.addError("missingKey", {
                type: this,
                message: `${key} is required`,
                key
            })
        }

        private addExtraneousKeyDiagnostic(
            state: Check.State<Dictionary>,
            keys: string[]
        ) {
            const message =
                keys.length === 1
                    ? `Key '${keys[0]}' was unexpected`
                    : `Keys '${keys.join("', '")}' were unexpected`
            state.addError("extraneousKeys", { type: this, message, keys })
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

    export type ExtraneousKeysDiagnostic = Check.ConfigureDiagnostic<
        Node,
        { keys: string[] },
        {
            enabled: boolean
        },
        Dictionary
    >

    export type MissingKeyDiagnostic = Check.ConfigureDiagnostic<
        Node,
        { key: string },
        {},
        Dictionary
    >
}
