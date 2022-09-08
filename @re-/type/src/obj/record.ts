import { Evaluate } from "@re-/tools"
import { Root } from "../root.js"
import { optional } from "../str/operator/optional.js"
import { Node, obj } from "./common.js"

export namespace Record {
    export type Definition = Record<string, unknown>

    export type Infer<
        Def,
        Ctx extends Node.InferenceContext,
        OptionalKey extends keyof Def = {
            [K in keyof Def]: Def[K] extends `${string}?` ? K : never
        }[keyof Def],
        RequiredKey extends keyof Def = Exclude<keyof Def, OptionalKey>
    > = Evaluate<
        {
            [K in RequiredKey]: Root.Infer<Def[K], Ctx>
        } & {
            [K in OptionalKey]?: Root.Infer<Def[K], Ctx>
        }
    >
}

type RecordLike = Record<string, unknown>

export const isArgValueRecordLike = (
    args: Node.Allows.Args
): args is Node.Allows.Args<RecordLike> =>
    typeof args.data === "object" &&
    args.data !== null &&
    !Array.isArray(args.data)

export class RecordNode extends obj<RecordLike> {
    get tree() {
        const result: Record<string, unknown> = {}
        for (const [prop, propNode] of this.entries) {
            result[prop] = propNode.tree
        }
        return result
    }

    allows(args: Node.Allows.Args) {
        if (!isArgValueRecordLike(args)) {
            args.diagnostics.push(
                new Node.Allows.UnassignableDiagnostic(this.toString(), args)
            )
            return false
        }
        const propValidationResults = this.allowsProps(args)
        if (
            propValidationResults.extraneousValueKeys.size &&
            (args.cfg.diagnostics?.ExtraneousKeys?.enable ||
                args.ctx.modelCfg.diagnostics?.ExtraneousKeys?.enable)
        ) {
            args.diagnostics.push(
                new ExtraneousKeysDiagnostic(args, [
                    ...propValidationResults.extraneousValueKeys
                ])
            )
            return false
        }
        return propValidationResults.allSeenKeysAllowed
    }

    // TODO: Should maybe not use set for perf?
    private allowsProps(args: Node.Allows.Args<Record<string, unknown>>) {
        const result = {
            extraneousValueKeys: new Set(Object.keys(args.data)),
            allSeenKeysAllowed: true
        }
        for (const [propKey, propNode] of this.entries) {
            const propArgs = this.argsForProp(args, propKey)
            if (propKey in args.data) {
                const propIsAllowed = propNode.allows(propArgs)
                if (!propIsAllowed) {
                    result.allSeenKeysAllowed = false
                }
            } else if (!(propNode instanceof optional)) {
                args.diagnostics.push(
                    new MissingKeyDiagnostic(
                        propNode.toString(),
                        propArgs,
                        propKey
                    )
                )
                result.allSeenKeysAllowed = false
            }
            result.extraneousValueKeys.delete(propKey)
        }
        return result
    }

    private argsForProp(
        args: Node.Allows.Args<Record<string, unknown>>,
        propKey: string
    ): Node.Allows.Args {
        return {
            ...args,
            data: args.data[propKey],
            ctx: {
                ...args.ctx,
                path: [...args.ctx.path, propKey]
            }
        }
    }

    create(args: Node.Create.Args) {
        const result: Record<string, unknown> = {}
        for (const [propKey, propNode] of this.entries) {
            // Don't include optional keys by default in generated values
            if (propNode instanceof optional) {
                continue
            }
            result[propKey] = propNode.create({
                ...args,
                ctx: {
                    ...args.ctx,
                    path: [...args.ctx.path, propKey]
                }
            })
        }
        return result
    }
}

export class ExtraneousKeysDiagnostic extends Node.Allows.Diagnostic<
    "ExtraneousKeys",
    { enable?: boolean }
> {
    public message: string

    constructor(args: Node.Allows.Args, public keys: string[]) {
        super("ExtraneousKeys", args)
        this.message = `Keys ${keys
            .map((k) => `'${k}'`)
            .join(", ")} were unexpected.`
    }
}

export class MissingKeyDiagnostic extends Node.Allows.Diagnostic<"MissingKey"> {
    public message: string

    constructor(
        public type: string,
        args: Node.Allows.Args,
        public key: string
    ) {
        super("MissingKey", args)
        this.message = `Missing required value of type ${type}.`
    }
}
