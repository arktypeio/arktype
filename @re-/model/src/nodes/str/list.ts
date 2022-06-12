import { deepMerge } from "@re-/tools"
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
                this.addUnassignable(args)
                return
            }
            const nextNode = this.next()
            for (const [i, element] of Object.entries(args.value)) {
                nextNode.allows({
                    ...args,
                    value: element,
                    ctx: deepMerge(args.ctx, {
                        valuePath: Common.pathAdd(args.ctx.valuePath, i)
                    })
                })
            }
        }

        generate() {
            return []
        }
    }
}
