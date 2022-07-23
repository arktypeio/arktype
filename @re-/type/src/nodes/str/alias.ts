import { WithPropValue } from "@re-/tools"
import { Resolution } from "../resolution.js"
import { Root } from "../root.js"
import { Base } from "./base.js"

export namespace Alias {
    export type TypeOf<
        Def extends keyof Ctx["dict"],
        Ctx extends Base.Parsing.InferenceContext
    > = "onResolve" extends keyof Ctx["meta"]
        ? Def extends "$resolution"
            ? BaseTypeOf<Def, Ctx>
            : OnResolveTypeOf<Def, Ctx>
        : "onCycle" extends keyof Ctx["meta"]
        ? Def extends keyof Ctx["seen"]
            ? OnCycleTypeOf<Def, Ctx>
            : BaseTypeOf<Def, Ctx>
        : BaseTypeOf<Def, Ctx>

    type BaseTypeOf<
        Def extends keyof Ctx["dict"],
        Ctx extends Base.Parsing.InferenceContext
    > = Root.TypeOf<Ctx["dict"][Def], Ctx & { seen: { [K in Def]: true } }>

    type OnResolveTypeOf<
        Def extends keyof Ctx["dict"],
        Ctx extends Base.Parsing.InferenceContext
    > = Root.TypeOf<
        Ctx["meta"]["onResolve"],
        {
            dict: WithPropValue<Ctx["dict"], "$resolution", Ctx["dict"][Def]>
            meta: Ctx["meta"]
            seen: Ctx["seen"] & { [K in Def]: true }
        }
    >

    type OnCycleTypeOf<
        Def extends keyof Ctx["dict"],
        Ctx extends Base.Parsing.InferenceContext
    > = Root.TypeOf<
        Ctx["meta"]["onCycle"],
        {
            dict: WithPropValue<Ctx["dict"], "$cyclic", Ctx["dict"][Def]>
            meta: Ctx["meta"]
            seen: {}
        }
    >

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
