import { Entry, Evaluate } from "@re-/tools"
import { Common } from "../common.js"
import { Root } from "../root.js"
import { Optional } from "../str/index.js"
import { Branch } from "./common.js"

export namespace Map {
    export type Definition = Record<string, unknown>

    export type Parse<
        Def,
        Dict,
        Seen,
        OptionalKey extends keyof Def = {
            [K in keyof Def]: Def[K] extends Optional.Definition ? K : never
        }[keyof Def],
        RequiredKey extends keyof Def = Exclude<keyof Def, OptionalKey>
    > = Evaluate<
        {
            -readonly [K in RequiredKey]: Root.Parse<Def[K], Dict, Seen>
        } & {
            -readonly [K in OptionalKey]?: Root.Parse<Def[K], Dict, Seen>
        }
    >

    type ParseResult = Entry<string, Common.Parser.Node>[]

    export const isMapLike = (
        value: unknown
    ): value is Record<string, unknown> =>
        typeof value === "object" && value !== null && !Array.isArray(value)

    export class Node extends Branch<Definition, ParseResult> {
        parse() {
            return Object.entries(this.def).map(([prop, propDef]) => [
                prop,
                Root.parse(propDef, {
                    ...this.ctx,
                    path: Common.pathAdd(this.ctx.path, prop)
                })
            ]) as ParseResult
        }

        allows(args: Common.Allows.Args) {
            if (!isMapLike(args.value)) {
                this.addUnassignable(args)
                return
            }
            const valueKeysLeftToCheck = new Set(Object.keys(args.value))
            for (const [prop, node] of this.next()) {
                const pathWithProp = Common.pathAdd(args.ctx.path, prop)
                if (prop in args.value) {
                    node.allows({
                        ...args,
                        value: args.value[prop],
                        ctx: {
                            ...args.ctx,
                            path: pathWithProp
                        }
                    })
                } else if (!(node instanceof Optional.Node)) {
                    args.errors.add(
                        pathWithProp,
                        `Required value of type ${node.stringifyDef()} was missing.`
                    )
                }
                valueKeysLeftToCheck.delete(prop)
            }
            if (
                valueKeysLeftToCheck.size &&
                !args.cfg.ignoreExtraneousKeys &&
                !args.ctx.modelCfg.ignoreExtraneousKeys
            ) {
                args.errors.add(
                    args.ctx.path,
                    `Keys ${[...valueKeysLeftToCheck]
                        .map((k) => `'${k}'`)
                        .join(", ")} were unexpected.`
                )
            }
        }

        generate(args: Common.Generate.Args) {
            const result: Definition = {}
            for (const [prop, node] of this.next()) {
                // Don't include optional keys by default in generated values
                if (node instanceof Optional.Node) {
                    continue
                }
                result[prop] = node.generate({
                    ...args,
                    ctx: {
                        ...args.ctx,
                        path: Common.pathAdd(args.ctx.path, prop)
                    }
                })
            }
            return result
        }
    }
}
