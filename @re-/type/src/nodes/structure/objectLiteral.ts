import type { Dictionary } from "@re-/tools"
import { Base, ObjectKind } from "../base.js"
import { Optional } from "../expression/optional.js"
import type { Check } from "../traverse/check.js"

export namespace ObjectLiteral {
    export class Node extends Base.Node<"objectLiteral"> {
        readonly kind = "objectLiteral"

        constructor(children: Base.UnknownNode[], private keys: string[]) {
            super(children, true)
        }

        allows(state: Check.State) {
            if (!ObjectKind.check(this, "object", state)) {
                return
            }
            this.checkChildrenAndGetIllegalKeys(state)
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
                state.path.push(k)
                if (k in rootData) {
                    state.data = rootData[k]
                    child.allows(state)
                } else if (!(child instanceof Optional.Node)) {
                    // this.addMissingKeyDiagnostic(state, k)
                }
                state.path.pop()
                delete uncheckedData[k]
            }
            state.data = rootData
            return Object.keys(uncheckedData)
        }

        // private addMissingKeyDiagnostic(
        //     state: Check.State<Dictionary>,
        //     key: string
        // ) {
        //     state.addError("missingKey", {
        //         type: this,
        //         message: `${key} is required`,
        //         key
        //     })
        // }

        // private addExtraneousKeyDiagnostic(
        //     state: Check.State<Dictionary>,
        //     keys: string[]
        // ) {
        //     const message =
        //         keys.length === 1
        //             ? `Key '${keys[0]}' was unexpected`
        //             : `Keys '${keys.join("', '")}' were unexpected`
        //     state.addError("extraneousKeys", { type: this, message, keys })
        // }

        get definition() {
            const result: Dictionary = {}
            for (let i = 0; i < this.children.length; i++) {
                result[this.keys[i]] = this.children[i].definition
            }
            return result
        }

        get ast() {
            const result: Dictionary = {}
            for (let i = 0; i < this.children.length; i++) {
                result[this.keys[i]] = this.children[i].ast
            }
            return result
        }

        toString() {
            return this.buildString(this.mapChildrenToStrings())
        }

        get description() {
            return this.buildString(this.mapChildrenToDescriptions())
        }

        get mustBe() {
            return "an object"
        }

        private buildString(stringifiedChildren: string[]) {
            if (!stringifiedChildren.length) {
                return "{}"
            }
            let result = "{"
            let i = 0
            for (i; i < stringifiedChildren.length - 1; i++) {
                result += this.keys[i] + ": " + stringifiedChildren[i] + ", "
            }
            return result + stringifiedChildren[i] + "}"
        }
    }

    export type ExtraneousKeysDiagnostic = Check.ConfigureDiagnostic<
        Node,
        { keys: string[] },
        {},
        Dictionary
    >

    export type MissingKeyDiagnostic = Check.ConfigureDiagnostic<
        Node,
        { key: string },
        {},
        never
    >
}
