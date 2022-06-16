import { Entry } from "@re-/tools"
import { Root } from "../root.js"
import { Common } from "#common"

export namespace Tuple {
    export type Definition = unknown[] | readonly unknown[]

    const lengthError = (def: Definition, value: Definition) =>
        `Tuple of length ${value.length} is not assignable to tuple of length ${def.length}.`

    export const matches = (def: object): def is Definition =>
        Array.isArray(def)

    type ParseResult = Entry<number, Common.Parser.Node>[]

    export class Node extends Common.Branch<Definition, ParseResult> {
        parse() {
            return this.def.map((elementDef, elementIndex) => [
                elementIndex,
                Root.parse(elementDef, {
                    ...this.ctx,
                    path: Common.pathAdd(this.ctx.path, elementIndex)
                })
            ]) as ParseResult
        }

        allows(args: Common.Allows.Args) {
            if (!Array.isArray(args.value)) {
                this.addUnassignable(args)
                return
            }
            if (this.def.length !== args.value.length) {
                args.errors.add(
                    args.ctx.path,
                    lengthError(this.def, args.value)
                )
                return
            }
            for (const [i, node] of this.next()) {
                node.allows({
                    ...args,
                    value: args.value[i],
                    ctx: {
                        ...args.ctx,
                        path: Common.pathAdd(args.ctx.path, i)
                    }
                })
            }
        }

        generate(args: Common.Generate.Args) {
            const result: unknown[] = []
            for (const [i, node] of this.next()) {
                result.push(
                    node.generate({
                        ...args,
                        ctx: {
                            ...args.ctx,
                            path: Common.pathAdd(args.ctx.path, i)
                        }
                    })
                )
            }
            return result
        }
    }
}
