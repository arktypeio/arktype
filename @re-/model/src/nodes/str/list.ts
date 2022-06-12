import { Str } from "./str.js"
import { Branch, Common } from "#common"

export namespace List {
    export type Definition<Child extends string = string> = `${Child}[]`

    export const matches = (def: string): def is Definition =>
        def.endsWith("[]")

    export class Node extends Branch<Definition> {
        parse() {
            return Str.parse(this.def.slice(0, -2), this.ctx)
        }

        allows(args: Common.AllowsArgs) {
            if (!Array.isArray(args.value)) {
                this.addUnassignable(args.value, args.errors)
                return
            }
            for (const [i, element] of Object.entries(args.value)) {
                const itemErrors = this.next().validateByPath(
                    element,
                    args.options
                )
                for (const [path, message] of Object.entries(itemErrors)) {
                    let itemPath = this.appendToPath(i)
                    if (path !== this.ctx.path) {
                        itemPath += path.slice(this.ctx.path.length)
                    }
                    args.errors[itemPath] = message
                }
            }
        }

        generate() {
            return []
        }
    }
}
