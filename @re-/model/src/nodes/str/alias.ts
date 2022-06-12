import { And, RequireKeys, WithPropValue } from "@re-/tools"
import { Root } from "../root.js"
import { Common, Leaf } from "#common"

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

    export const matches = (
        def: string,
        ctx: Common.ParseContext
    ): ctx is RequireKeys<Common.ParseContext, "space"> =>
        !!ctx.space?.models[def]

    export class Node extends Leaf<string> {
        resolve() {
            // the matches() function has already ensured space is defined
            return this.ctx.space!.models[this.def].root
            /**
             * Keep track of definitions we've seen since last resolving to an object or built-in.
             * If we encounter the same definition twice, we're dealing with a shallow cyclic space
             * like {user: "person", person: "user"}.
             *
             */
            // if (this.ctx.shallowSeen.includes(this.def)) {
            //     throw new Error("Shallow cycle")
            // }
            // let nextDef = space.modelDefinitionEntries[this.def]
            // if (this.ctx.seen.includes(this.def) && "onCycle" in space.config) {
            //     space.inputs.dictionary.cyclic = nextDef
            //     nextDef = space.config.onCycle
            // } else if (
            //     this.ctx.seen.includes(this.def) &&
            //     "onResolve" in space.config
            // ) {
            //     space.inputs.dictionary.resolution = nextDef
            //     nextDef = space.config.onResolve
            // }
        }

        private nextMethodContext(
            ctx: Common.MethodContext
        ): Common.MethodContext {
            return {
                ...ctx,
                seen: [...ctx.seen, this.def],
                shallowSeen: [...ctx.shallowSeen, this.def]
            }
        }

        allows(args: Common.AllowsArgs) {
            return this.resolve().allows({
                ...args,
                ctx: this.nextMethodContext(args.ctx)
            })
        }

        generate(args: Common.GenerateArgs) {
            return this.resolve().generate({
                ...args,
                ctx: this.nextMethodContext(args.ctx)
            })
        }
    }
}
