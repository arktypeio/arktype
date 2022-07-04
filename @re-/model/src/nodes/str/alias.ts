import { And, Get, WithPropValue } from "@re-/tools"
import type { MetaKey } from "../../space.js"
import { Root } from "../root.js"
import { Base } from "./base.js"

type GetMetaDefinitions<Dict> = MetaKey extends keyof Dict ? Dict[MetaKey] : {}

export namespace Alias {
    export type Parse<
        Def extends keyof Dict,
        Dict,
        Seen
    > = Dict[Def] extends Base.Parsing.ParseErrorMessage
        ? unknown
        : And<
              "onResolve" extends keyof GetMetaDefinitions<Dict> ? true : false,
              Def extends "resolution" ? false : true
          > extends true
        ? Root.Parse<
              Get<GetMetaDefinitions<Dict>, "onResolve">,
              WithPropValue<Dict, "resolution", Dict[Def]>,
              Seen & { [K in Def]: true }
          >
        : And<
              "onCycle" extends keyof GetMetaDefinitions<Dict> ? true : false,
              Def extends keyof Seen ? true : false
          > extends true
        ? Root.Parse<
              Get<GetMetaDefinitions<Dict>, "onCycle">,
              WithPropValue<Dict, "cyclic", Dict[Def]>,
              {}
          >
        : Root.Parse<Dict[Def], Dict, Seen & { [K in Def]: true }>

    export const matches = (def: string, ctx: Base.Parsing.Context) =>
        def in ctx.resolutions

    export class Node extends Base.Leaf<string> {
        // @ts-ignore (spurious initialization error)
        resolution: Base.Parsing.Node

        constructor(def: string, ctx: Base.Parsing.Context) {
            // If we've already seen this alias, the resolution will be an Alias node, so just return that
            if (ctx.resolutions[def] instanceof Node) {
                return ctx.resolutions[def] as Node
            }
            super(def, ctx)
            // Otherwise, ctx.resolutions[def] will be a definition from space, so use it to parse the next node
            const unresolvedDefinition = ctx.resolutions[def]
            // Before parsing the definition, we update the resolution to be this Node so we don't try and parse it again
            ctx.resolutions[def] = this
            this.resolution = Root.parse(unresolvedDefinition, this.ctx)
        }

        allows(args: Base.Validation.Args): boolean {
            const nextArgs = this.nextArgs(args, this.ctx.cfg.validate)
            if (typeof args.value === "object" && args.value !== null) {
                if (
                    args.ctx.checkedValuesByAlias[this.def]?.includes(
                        args.value
                    )
                ) {
                    // If we've already seen this value, it must not have any errors or else we wouldn't be here
                    return true
                }
                if (!args.ctx.checkedValuesByAlias[this.def]) {
                    nextArgs.ctx.checkedValuesByAlias[this.def] = [args.value]
                } else {
                    nextArgs.ctx.checkedValuesByAlias[this.def].push(args.value)
                }
            }
            const customValidator =
                nextArgs.cfg.validator ??
                nextArgs.ctx.modelCfg.validator ??
                "default"
            if (customValidator !== "default") {
                return Base.Validation.customValidatorAllows(
                    customValidator,
                    this,
                    nextArgs
                )
            }
            return this.resolution.allows(nextArgs)
        }

        generate(args: Base.Generation.Args) {
            const nextArgs = this.nextArgs(args, this.ctx.cfg.generate)
            if (args.ctx.seen.includes(this.def)) {
                const onRequiredCycle =
                    nextArgs.cfg.onRequiredCycle ??
                    nextArgs.ctx.modelCfg.onRequiredCycle
                if (onRequiredCycle) {
                    return onRequiredCycle
                }
                throw new Base.Generation.RequiredCycleError(
                    this.def,
                    args.ctx.seen
                )
            }
            return this.resolution.generate(nextArgs)
        }

        private nextArgs<
            Args extends {
                ctx: Base.Traversal.Context<any>
                cfg: any
            }
        >(args: Args, aliasCfg: any): Args {
            return {
                ...args,
                ctx: {
                    ...args.ctx,
                    seen: [...args.ctx.seen, this.def],
                    modelCfg: { ...args.ctx.modelCfg, ...aliasCfg }
                }
            }
        }
    }
}
