import type { Check } from "../../traverse/check.js"
import { Branching } from "./branching.js"

export namespace Intersection {
    export const token = "&"

    export type Token = typeof token

    export class Node extends Branching.Node<Token> {
        readonly token = token

        allows(state: Check.State) {
            for (const branch of this.children) {
                branch.allows(state)
            }
        }
    }
}
