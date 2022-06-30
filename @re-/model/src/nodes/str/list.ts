import { Base, StrBase } from "./base.js"
import { Str } from "./str.js"

export namespace List {
    export type Definition<Child extends string = string> = `${Child}[]`

    export const matches = (def: string): def is Definition =>
        def.endsWith("[]")

    export class Node extends StrBase.Branch<Definition> {
        parse() {
            return Str.parse(this.def.slice(0, -2), this.ctx)
        }

        allows(args: Base.Validation.Args) {
            if (!Array.isArray(args.value)) {
                this.addUnassignable(args)
                return
            }
            const nextNode = this.next()
            for (const [i, element] of Object.entries(args.value)) {
                nextNode.allows({
                    ...args,
                    value: element,
                    ctx: {
                        ...args.ctx,
                        path: Base.pathAdd(args.ctx.path, i)
                    }
                })
            }
        }

        generate() {
            return []
        }
    }
}
