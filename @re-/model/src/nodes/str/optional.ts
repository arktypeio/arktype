import { Base } from "./base.js"
import { Str } from "./str.js"

const invalidModifierErrorMessage = `Modifier '?' is only valid at the end of a type definition.`

type InvalidModifierError = typeof invalidModifierErrorMessage

export namespace Optional {
    export type Definition<Child extends string = string> = `${Child}?`

    export type Validate<
        Child extends string,
        Dict,
        Root
    > = `${Child}?` extends Root
        ? Str.Validate<Child, Dict, Root>
        : Base.Parsing.ParseErrorMessage<InvalidModifierError>

    export const matches = (def: string): def is Definition => def.endsWith("?")

    export class Node extends Base.Branch<Definition> {
        parse() {
            if (this.ctx.stringRoot !== this.def) {
                throw new Base.Parsing.ParseError(invalidModifierErrorMessage)
            }
            return [Str.parse(this.def.slice(0, -1), this.ctx)]
        }

        allows(args: Base.Validation.Args) {
            if (args.value !== undefined) {
                return this.firstChild().allows(args)
            }
            return true
        }

        generate() {
            return undefined
        }
    }
}
