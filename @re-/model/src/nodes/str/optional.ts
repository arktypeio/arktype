import { Node, ParseFunction, Parser } from "./internal.js"
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

    class OptionalParser extends Parser<Definition> {
        next() {
            // if (this.ctx.stringRoot !== this.def) {
            //     throw new Error(invalidModifierError)
            // }
            return { def: this.def.slice(0, -1), ctx: this.ctx, node: Str.node }
        }

        validate(value: unknown) {
            if (value === undefined) {
                return true
            }
            return this.parseNext().validate(value)
        }
    }

    export const node: Node<Definition, string> = {
        matches: (def) => def.endsWith("?"),
        parser: OptionalParser
    }

    export const parse: ParseFunction<string> = (def, ctx) => {
        return {
            validate: (value: unknown) => {
                if (value === undefined) {
                    return true
                }
                return Str.parse(def.slice(0, -1), ctx).validate(value)
            }
        }
    }
}
