import { Evaluate } from "@re-/tools"
import { Root } from "../root.js"
import { Optional } from "../str/index.js"
import { Base } from "./base.js"

export namespace Record {
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

    export const valueIsRecordLike = (
        value: unknown
    ): value is Record<string, unknown> =>
        typeof value === "object" && value !== null && !Array.isArray(value)

    export class Node extends Base.Branch<Definition> {
        private childIndicesToPropNames: Record<number, string> | undefined

        parse() {
            this.childIndicesToPropNames = {}
            return Object.entries(this.def).map(
                ([propName, propDef], childIndex) => {
                    this.childIndicesToPropNames![childIndex] = propName
                    return Root.parse(propDef, {
                        ...this.ctx,
                        path: Base.pathAdd(this.ctx.path, propName)
                    })
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
            let childIndex = 0
            for (const propNode of this.children()) {
                const propName = this.childIndicesToPropNames![childIndex]
                const pathWithProp = Base.pathAdd(args.ctx.path, propName)
                if (propName in args.value) {
                    const propIsAllowed = propNode.allows({
                        ...args,
                        value: args.value[propName],
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
                valueKeysLeftToCheck.delete(propName)
                childIndex++
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

        generate(args: Base.Generation.Args) {
            const result: Record<string, unknown> = {}
            let childIndex = 0
            for (const propNode of this.children()) {
                const propName = this.childIndicesToPropNames![childIndex]
                // Don't include optional keys by default in generated values
                if (propNode instanceof Optional.Node) {
                    continue
                }
                result[propName] = propNode.generate({
                    ...args,
                    ctx: {
                        ...args.ctx,
                        path: Base.pathAdd(args.ctx.path, propName)
                    }
                })
                childIndex++
            }
            return result
        }
    }
}
