import { Entry } from "@re-/tools"
import { Root } from "../root.js"
import { Base, ObjBase } from "./base.js"

export namespace Tuple {
    export type Definition = unknown[] | readonly unknown[]

    const lengthError = (def: Definition, value: Definition) =>
        `Tuple of length ${value.length} is not assignable to tuple of length ${def.length}.`

    export const matches = (def: object): def is Definition =>
        Array.isArray(def)

    type ParseResult = Entry<number, Base.Parsing.Node>[]

    export class Node extends ObjBase.Branch<Definition, ParseResult> {
        parse() {
            return this.def.map((elementDef, elementIndex) => [
                elementIndex,
                Root.parse(elementDef, {
                    ...this.ctx,
                    path: Base.pathAdd(this.ctx.path, elementIndex)
                })
            ]) as ParseResult
        }

        allows(args: Base.Validation.Args) {
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
                        path: Base.pathAdd(args.ctx.path, i)
                    }
                })
            }
        }

        generate(args: Base.Generation.Args) {
            const result: unknown[] = []
            for (const [i, node] of this.next()) {
                result.push(
                    node.generate({
                        ...args,
                        ctx: {
                            ...args.ctx,
                            path: Base.pathAdd(args.ctx.path, i)
                        }
                    })
                )
            }
            return result
        }
    }
}
