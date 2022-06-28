import { And, Get, WithPropValue } from "@re-/tools"
import type { MetaKey } from "../../space.js"
import { Common } from "../common.js"
import { Root } from "../root.js"

type GetMetaDefinitions<Dict> = MetaKey extends keyof Dict ? Dict[MetaKey] : {}

export namespace Alias {
    export type Parse<
        Def extends keyof Dict,
        Dict,
        Seen
    > = Dict[Def] extends Common.Parser.ParseErrorMessage
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

    export const matches = (def: string, ctx: Common.Parser.Context) =>
        def in ctx.resolutions

    export class Node extends Common.Leaf<string> {
        // @ts-ignore (spurious initialization error)
        private next: Common.Parser.Node

        constructor(
            def: string,
            ctx: Common.Parser.Context,
            private nextDef?: unknown
        ) {
            if (def in ctx.resolutions) {
                return ctx.resolutions[def]
            }
            super(def, ctx)
            ctx.resolutions[def] = this
            this.next = Root.parse(this.nextDef, this.ctx)
        }

        allows(args: Common.Allows.Args) {
            const nextArgs = this.nextArgs(args, this.ctx.cfg.validate)
            if (typeof args.value === "object" && args.value !== null) {
                if (
                    args.ctx.checkedValuesByAlias[this.def]?.includes(
                        args.value
                    )
                ) {
                    // If we've already seen this value, it must not have any errors or else we wouldn't be here
                    return
                }
                if (!args.ctx.checkedValuesByAlias[this.def]) {
                    nextArgs.ctx.checkedValuesByAlias[this.def] = [args.value]
                } else {
                    nextArgs.ctx.checkedValuesByAlias[this.def] = [
                        ...args.ctx.checkedValuesByAlias[this.def],
                        args.value
                    ]
                }
            }
            const customValidator =
                nextArgs.cfg.validator ??
                nextArgs.ctx.modelCfg.validator ??
                "default"
            if (customValidator !== "default") {
                Common.Allows.customValidatorAllows(
                    customValidator,
                    this,
                    nextArgs
                )
            } else {
                this.next.allows(nextArgs)
            }
        }

        generate(args: Common.Generate.Args) {
            const nextArgs = this.nextArgs(args, this.ctx.cfg.generate)
            if (args.ctx.seen.includes(this.def)) {
                const onRequiredCycle =
                    nextArgs.cfg.onRequiredCycle ??
                    nextArgs.ctx.modelCfg.onRequiredCycle
                if (onRequiredCycle) {
                    return onRequiredCycle
                }
                throw new Common.Generate.RequiredCycleError(
                    this.def,
                    args.ctx.seen
                )
            }
            return this.next.generate(nextArgs)
        }

        private nextArgs<
            Args extends {
                ctx: Common.Traverse.Context<any>
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
