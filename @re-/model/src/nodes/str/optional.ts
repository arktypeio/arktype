import { Str } from "./str.js"
import { Base } from "#base"

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

    export const matches = (def: string): def is Definition => def.endsWith("?")

    export class Node extends Base.NonTerminal<Definition> {
        #child?: Base.Node<unknown>
        get child() {
            if (!this.#child) {
                this.#child = Str.parse(this.def.slice(0, -1), this.ctx)
            }
            return this.#child
        }

        allows(value: unknown, errors: Base.ErrorsByPath) {
            if (value !== undefined) {
                this.child.allows(value, errors)
            }
        }

        generate() {
            return undefined
        }
    }
}
