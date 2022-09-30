import type { Check } from "../../traverse/exports.js"
import { Nary } from "./nary.js"

export namespace Intersection {
    export const token = "&"

    export type Token = typeof token

    export class Node extends Nary.Node<Token> {
        readonly token = token

        check(state: Check.CheckState) {
            for (const branch of this.children) {
                branch.check(state)
            }
        }
    }
}
