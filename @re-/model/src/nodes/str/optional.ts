import { Str } from "./str.js"
import { BaseNode, BaseNodeClass, ErrorsByPath } from "#node"

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

    export const Node: BaseNodeClass<
        Definition,
        string
    > = class extends BaseNode<Definition> {
        static matches(def: string): def is Definition {
            return def.endsWith("?")
        }

        next() {
            // if (this.ctx.stringRoot !== this.def) {
            //     throw new Error(invalidModifierError)
            // }
            return Str.Node.parse(this.def.slice(0, -1), this.ctx)
        }

        validate(value: unknown, errors: ErrorsByPath) {
            if (value !== undefined) {
                this.next().validate(value, errors)
            }
        }

        generate() {
            return undefined
        }
    }
}
