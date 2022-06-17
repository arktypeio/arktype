import { diffSets, Entry, Evaluate } from "@re-/tools"
import { Root } from "../root.js"
import { Optional } from "../str/index.js"
import { Common } from "#common"

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

    export class Node extends Common.Branch<Definition, ParseResult> {
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
            if (
                typeof args.value !== "object" ||
                args.value === null ||
                Array.isArray(args.value)
            ) {
                this.addUnassignable(args)
                return
            }
            const keyErrors = this.checkKeyErrors(args)
            if (keyErrors) {
                args.errors.add(args.ctx.path, keyErrors)
                return
            }
            for (const [prop, node] of this.next()) {
                node.allows({
                    ...args,
                    value: (args.value as any)[prop],
                    ctx: {
                        ...args.ctx,
                        path: Common.pathAdd(args.ctx.path, prop)
                    }
                })
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

        private checkKeyErrors = (args: Common.Allows.Args) => {
            let message = ""
            const keyDiff = diffSets(
                Object.keys(this.def),
                Object.keys(args.value as any)
            )
            if (!keyDiff) {
                return message
            }
            if (keyDiff.removed) {
                // Ignore missing keys that are optional
                const missingRequiredKeys = keyDiff.removed.filter(
                    (k) =>
                        !(
                            typeof this.def[k] === "string" &&
                            Optional.matches(this.def[k] as string)
                        )
                )
                if (missingRequiredKeys.length) {
                    message += `Required keys '${missingRequiredKeys.join(
                        ", "
                    )}' were missing.`
                }
            }
            if (
                keyDiff.added &&
                !args.cfg.ignoreExtraneousKeys &&
                !args.ctx.modelCfg.ignoreExtraneousKeys
            ) {
                // Add a leading space if we also had missing keys
                message += `${message ? " " : ""}Keys '${keyDiff.added.join(
                    ", "
                )}' were unexpected.`
            }
            return message
        }
    }
}
