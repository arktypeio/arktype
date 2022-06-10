import { Str } from "./str.js"
import { Common, Linked } from "#common"

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

    export class Node extends Linked<Definition> {
        parse() {
            return Str.parse(this.def.slice(0, -1), this.ctx)
        }

        allows(value: unknown, errors: Common.ErrorsByPath) {
            if (value !== undefined) {
                this.next().allows(value, errors)
            }
        }

        generate() {
            return undefined
        }
    }
}
