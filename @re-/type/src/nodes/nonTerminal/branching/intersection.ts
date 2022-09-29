import { Generate } from "../../traverse/exports.js"
import type { Check } from "../../traverse/exports.js"
import { Branching } from "./branching.js"

export namespace Intersection {
    export const token = "&"

    export type Token = typeof token

    export class IntersectionNode extends Branching.Node<Token> {
        readonly token = token

        check(state: Check.CheckState) {
            for (const branch of this.children) {
                branch.check(state)
            }
        }

        generate() {
            throw new Generate.UngeneratableError(
                this.toString(),
                "Intersection generation is unsupported."
            )
        }
    }
}
