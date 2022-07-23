import { And, Get, WithPropValue } from "@re-/tools"
import { Resolution } from "../resolution.js"
import { Root } from "../root.js"
import { Base } from "./base.js"

export namespace Alias {
    export type TypeOf<Def extends keyof Dict, Dict, Meta, Seen> = And<
        "onResolve" extends keyof Meta ? true : false,
        Def extends "$resolution" ? false : true
    > extends true
        ? Root.TypeOf<
              Get<Meta, "onResolve">,
              WithPropValue<Dict, "$resolution", Dict[Def]>,
              Meta,
              Seen & { [K in Def]: true }
          >
        : And<
              "onCycle" extends keyof Meta ? true : false,
              Def extends keyof Seen ? true : false
          > extends true
        ? Root.TypeOf<
              Get<Meta, "onCycle">,
              WithPropValue<Dict, "$cyclic", Dict[Def]>,
              Meta,
              {}
          >
        : Root.TypeOf<Dict[Def], Dict, Meta, Seen & { [K in Def]: true }>

    export const matches = (def: string, ctx: Base.Parsing.Context) =>
        !!ctx.space && def in ctx.space.dictionary

    export class Node extends Base.Leaf<string> {
        resolution = new Resolution.Node(
            this.def,
            this.ctx.space!,
            this.ctx.shallowSeen
        )

        allows(args: Base.Validation.Args) {
            return this.resolution.allows(args)
        }

        generate(args: Base.Create.Args) {
            return this.resolution.generate(args)
        }
    }
}
