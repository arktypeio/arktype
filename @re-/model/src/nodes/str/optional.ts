import { NonTerminalNode } from "./internal.js"
import { Str } from "./str.js"

const invalidModifierError = `Modifier '?' is only valid at the end of a type definition.`

type InvalidModifierError = typeof invalidModifierError

export namespace Optional {
    export type Definition<Child extends string = string> = `${Child}?`

    export type Validate<
        Child extends string,
        Dict,
        Root
    > = `${Child}?` extends Root
        ? Str.Validate<Child, Dict, Root>
        : InvalidModifierError

    export class Node extends NonTerminalNode<Definition> {
        next() {
            // if (this.ctx.stringRoot !== this.def) {
            //     throw new Error(invalidModifierError)
            // }
            return Str.parse(this.def.slice(0, -1), this.ctx)
        }

        validate(value: unknown) {
            if (value === undefined) {
                return true
            }
            return this.next().validate(value)
        }

        generate() {
            return undefined
        }
    }
}
