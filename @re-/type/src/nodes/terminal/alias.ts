import { WithPropValue } from "@re-/tools"
import { Base } from "../base/index.js"
import { Root } from "../root.js"
import { Terminal } from "./terminal.js"

export namespace AliasType {
    export type Infer<
        Def extends keyof Ctx["dict"],
        Ctx extends Base.Parsing.InferenceContext
    > = "onResolve" extends keyof Ctx["meta"]
        ? Def extends "$resolution"
            ? BaseOf<Def, Ctx>
            : OnResolveOf<Def, Ctx>
        : "onCycle" extends keyof Ctx["meta"]
        ? Def extends keyof Ctx["seen"]
            ? OnCycleOf<Def, Ctx>
            : BaseOf<Def, Ctx>
        : BaseOf<Def, Ctx>

    type BaseOf<
        Def extends keyof Ctx["dict"],
        Ctx extends Base.Parsing.InferenceContext
    > = Root.Infer<Ctx["dict"][Def], Ctx & { seen: { [K in Def]: true } }>

    type OnResolveOf<
        Def extends keyof Ctx["dict"],
        Ctx extends Base.Parsing.InferenceContext
    > = Root.Infer<
        Ctx["meta"]["onResolve"],
        {
            dict: WithPropValue<Ctx["dict"], "$resolution", Ctx["dict"][Def]>
            meta: Ctx["meta"]
            seen: Ctx["seen"] & { [K in Def]: true }
        }
    >

    type OnCycleOf<
        Def extends keyof Ctx["dict"],
        Ctx extends Base.Parsing.InferenceContext
    > = Root.Infer<
        Ctx["meta"]["onCycle"],
        {
            dict: WithPropValue<Ctx["dict"], "$cyclic", Ctx["dict"][Def]>
            meta: Ctx["meta"]
            seen: {}
        }
    >
}

export class AliasNode extends Terminal {
    static matches(def: string, ctx: Base.Parsing.Context) {
        return !!ctx.space && def in ctx.space.dictionary
    }

    constructor(def: string, private ctx: Base.Parsing.Context) {
        super(def)
    }

    get resolution() {
        return this.ctx.space!.resolutions[this.def]
    }

    allows(args: Base.Validation.Args): boolean {
        return this.resolution.allows(args)
    }

    generate(args: Base.Create.Args): unknown {
        return this.resolution.generate(args)
    }
}
