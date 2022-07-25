import { Base } from "./base.js"
import { Str } from "./str.js"

const invalidModifierErrorMessage = `Modifier '?' is only valid at the end of a type definition.`

type InvalidModifierError = typeof invalidModifierErrorMessage

export namespace Optional {
    export type Definition<Child extends string = string> = `${Child}?`

    export const matches = (def: string): def is Definition => def.endsWith("?")

    export class Node extends Base.NonTerminal {
        allows(args: Base.Validation.Args) {
            if (args.value === undefined) {
                return true
            }
            return this.children.allows(args)
        }

        generate() {
            return undefined
        }
    }
}
