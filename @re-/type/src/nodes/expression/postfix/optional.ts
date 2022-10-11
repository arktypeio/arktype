import type { Check } from "../../traverse/check.js"
import { Postfix } from "./postfix.js"

export namespace Optional {
    export const token = "?"

    export type Token = typeof token

    export class Node extends Postfix.Node<Token> {
        readonly token = token

        allows(data: unknown) {
            if (data === undefined) {
                return true
            }
        }

        toDescription() {
            return `optional ${this.child.toDescription()}`
        }
    }
}
