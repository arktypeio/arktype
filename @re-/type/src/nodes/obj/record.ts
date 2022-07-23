import { Evaluate, TreeOf } from "@re-/tools"
import { Root } from "../root.js"
import { Optional } from "../str/index.js"
import { Base } from "./base.js"

export namespace Record {
    export type Definition = Record<string, unknown>

    export type TypeOf<
        Def,
        Dict,
        Meta,
        Seen,
        OptionalKey extends keyof Def = {
            [K in keyof Def]: Def[K] extends Optional.Definition ? K : never
        }[keyof Def],
        RequiredKey extends keyof Def = Exclude<keyof Def, OptionalKey>
    > = Evaluate<
        {
            -readonly [K in RequiredKey]: Root.TypeOf<Def[K], Dict, Meta, Seen>
        } & {
            -readonly [K in OptionalKey]?: Root.TypeOf<Def[K], Dict, Meta, Seen>
        }
    >

    export const valueIsRecordLike = (
        value: unknown
    ): value is Record<string, unknown> =>
        typeof value === "object" && value !== null && !Array.isArray(value)

    export class Node extends Base.Shape<Definition> {
        parse() {
            return Object.entries(this.def).map(
                ([key, propDef]): [string, Base.Parsing.Node] => {
                    return [
                        key,
                        Root.parse(propDef, {
                            ...this.ctx,
                            path: Base.pathAdd(this.ctx.path, key)
                        })
                    ]
                }
            )
        }

        allows(args: Base.Validation.Args) {
            if (!valueIsRecordLike(args.value)) {
                this.addUnassignable(args)
                return false
            }
            const valueKeysLeftToCheck = new Set(Object.keys(args.value))
            let allPropsAllowed = true
            for (const [propKey, propNode] of this.entries) {
                const pathWithProp = Base.pathAdd(args.ctx.path, propKey)
                if (propKey in args.value) {
                    const propIsAllowed = propNode.allows({
                        ...args,
                        value: args.value[propKey],
                        ctx: {
                            ...args.ctx,
                            path: pathWithProp
                        }
                    })
                    if (!propIsAllowed) {
                        allPropsAllowed = false
                    }
                } else if (!(propNode instanceof Optional.Node)) {
                    args.errors.add(
                        pathWithProp,
                        `Required value of type ${propNode.defToString()} was missing.`
                    )
                    allPropsAllowed = false
                }
                valueKeysLeftToCheck.delete(propKey)
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
                return false
            }
            return allPropsAllowed
        }

        generate(args: Base.Create.Args) {
            const result: Record<string, unknown> = {}
            for (const [propKey, propNode] of this.entries) {
                // Don't include optional keys by default in generated values
                if (propNode instanceof Optional.Node) {
                    continue
                }
                result[propKey] = propNode.generate({
                    ...args,
                    ctx: {
                        ...args.ctx,
                        path: Base.pathAdd(args.ctx.path, propKey)
                    }
                })
            }
            return result
        }

        override structureReferences(args: Base.References.Args) {
            const structuredReferences: Record<string, TreeOf<string[]>> = {}
            for (const [propKey, propNode] of this.entries) {
                structuredReferences[propKey] =
                    propNode.structureReferences(args)
            }
            return structuredReferences
        }
    }
}
