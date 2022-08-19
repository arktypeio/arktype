import { Evaluate } from "@re-/tools"
import { Root } from "../../../root.js"
import { Base } from "../../base/index.js"
import { OptionalNode } from "../optional.js"
import { StructuredNonTerminal } from "./structuredNonTerminal.js"

export namespace RecordType {
    export type Definition = Record<string, unknown>

    export type Infer<
        Def,
        Ctx extends Base.Parsing.InferenceContext,
        OptionalKey extends keyof Def = {
            [K in keyof Def]: Def[K] extends `${string}?` ? K : never
        }[keyof Def],
        RequiredKey extends keyof Def = Exclude<keyof Def, OptionalKey>
    > = Evaluate<
        {
            -readonly [K in RequiredKey]: Root.Infer<Def[K], Ctx>
        } & {
            -readonly [K in OptionalKey]?: Root.Infer<Def[K], Ctx>
        }
    >
}

type RecordLike = Record<string, unknown>

export const isArgValueRecordLike = (
    args: Base.Validation.Args
): args is Base.Validation.Args<RecordLike> =>
    typeof args.value === "object" &&
    args.value !== null &&
    !Array.isArray(args.value)

export class RecordNode extends StructuredNonTerminal {
    allows(args: Base.Validation.Args) {
        if (!isArgValueRecordLike(args)) {
            this.addUnassignable(args)
            return false
        }
        const propValidationResults = this.allowsProps(args)
        if (
            propValidationResults.unseenValueKeys.size &&
            !args.cfg.ignoreExtraneousKeys &&
            !args.ctx.modelCfg.ignoreExtraneousKeys
        ) {
            args.errors.add(
                args.ctx.path,
                `Keys ${[...propValidationResults.unseenValueKeys]
                    .map((k) => `'${k}'`)
                    .join(", ")} were unexpected.`
            )
            return false
        }
        return propValidationResults.allSeenKeysAllowed
    }

    private allowsProps(args: Base.Validation.Args<Record<string, unknown>>) {
        const result = {
            unseenValueKeys: new Set(Object.keys(args.value)),
            allSeenKeysAllowed: true
        }
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
                    result.allSeenKeysAllowed = false
                }
            } else if (!(propNode instanceof OptionalNode)) {
                args.errors.add(
                    pathWithProp,
                    `Required value of type ${propNode.toString()} was missing.`
                )
                result.allSeenKeysAllowed = false
            }
            result.unseenValueKeys.delete(propKey)
        }
        return result
    }

    generate(args: Base.Create.Args) {
        const result: Record<string, unknown> = {}
        for (const [propKey, propNode] of this.entries) {
            // Don't include optional keys by default in generated values
            if (propNode instanceof OptionalNode) {
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
}
