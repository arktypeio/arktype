import { And, Get, WithPropValue } from "@re-/tools"
import { Resolution } from "../resolution.js"
import { Root } from "../root.js"
import { Base } from "./base.js"

export namespace Alias {
    export type TypeOf<
        Def extends keyof Ctx["dict"],
        Ctx extends Base.Parsing.InferenceContext
    > = And<
        "onResolve" extends keyof Ctx["meta"] ? true : false,
        Def extends "$resolution" ? false : true
    > extends true
        ? Root.TypeOf<
              Get<Ctx["meta"], "onResolve">,
              {
                  dict: WithPropValue<
                      Ctx["dict"],
                      "$resolution",
                      Ctx["dict"][Def]
                  >
                  meta: Ctx["meta"]
                  seen: Ctx["seen"] & { [K in Def]: true }
              }
          >
        : And<
              "onCycle" extends keyof Ctx["meta"] ? true : false,
              Def extends keyof Ctx["seen"] ? true : false
          > extends true
        ? Root.TypeOf<
              Get<Ctx["meta"], "onCycle">,
              {
                  dict: WithPropValue<Ctx["dict"], "$cyclic", Ctx["dict"][Def]>
                  meta: Ctx["meta"]
                  seen: {}
              }
          >
        : Root.TypeOf<Ctx["dict"][Def], Ctx & { seen: { [K in Def]: true } }>

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
