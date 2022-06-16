import { And, WithPropValue } from "@re-/tools"
import { Root } from "../root.js"
import { Common } from "#common"

export namespace Alias {
    export type Parse<Def extends keyof Dict, Dict, Seen> = And<
        "onResolve" extends keyof Dict ? true : false,
        Def extends "resolution" ? false : true
    > extends true
        ? Root.Parse<
              // @ts-ignore
              Dict["onResolve"],
              WithPropValue<Dict, "resolution", Dict[Def]>,
              Seen & { [K in Def]: true }
          >
        : And<
              "onCycle" extends keyof Dict ? true : false,
              Def extends keyof Seen ? true : false
          > extends true
        ? Root.Parse<
              // @ts-ignore
              Dict["onCycle"],
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
            const customValidator =
                args.cfg.validator ?? this.ctx.cfg.validate?.validator
            if (customValidator && customValidator !== "default") {
                Common.Allows.customValidatorAllows(
                    customValidator,
                    this,
                    this.nextArgs(args)
                )
            } else {
                this.next.allows(this.nextArgs(args))
            }
        }

        generate(args: Common.Generate.Args) {
            if (args.ctx.seen.includes(this.def)) {
                if (args.cfg.onRequiredCycle) {
                    return args.cfg.onRequiredCycle
                }
                throw new Common.Generate.RequiredCycleError(
                    this.def,
                    args.ctx.seen
                )
            }
            return this.next.generate(this.nextArgs(args))
        }

        private nextArgs<Args extends { ctx: Common.Traverse.Context }>(
            args: Args
        ): Args {
            return {
                ...args,
                ctx: {
                    ...args.ctx,
                    seen: [...args.ctx.seen, this.def],
                    shallowSeen: [...args.ctx.shallowSeen, this.def]
                }
            }
        }
    }
}
