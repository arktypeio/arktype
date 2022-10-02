import type { Check } from "../traverse/check/check.js"
import { Nary } from "./expression.js"

export namespace Intersection {
    export const token = "&"

    export type Token = typeof token

    export class Node extends Nary.Node<Token> {
        readonly token = token

        check(state: Check.State) {
            for (const branch of this.children) {
                branch.check(state)
            }
        }
    }
}
