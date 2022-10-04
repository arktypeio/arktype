import type { Check } from "../traverse/check.js"
import { Branching } from "./expression.js"

export namespace Intersection {
    export const token = "&"

    export type Token = typeof token

    export class Node extends Branching.Node<Token> {
        readonly token = token

        check(state: Check.State) {
            for (const branch of this.children) {
                branch.check(state)
            }
        }
    }
}
