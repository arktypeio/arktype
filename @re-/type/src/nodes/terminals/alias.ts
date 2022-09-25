import type { WithPropValue } from "@re-/tools"
import type { Root } from "../../index.js"
import type { Base } from "../base.js"
import type { RootNode } from "../common.js"
import type { Check, Generate } from "../traverse/exports.js"
import { TerminalNode } from "./terminal.js"

export namespace Alias {
    export type Infer<
        Def extends keyof Ctx["Ast"],
        Ctx extends Base.InferenceContext
    > = "onResolve" extends keyof Ctx["Meta"]
        ? Def extends "$resolution"
            ? BaseOf<Def, Ctx>
            : OnResolveOf<Def, Ctx>
        : "onCycle" extends keyof Ctx["Meta"]
        ? Def extends keyof Ctx["Seen"]
            ? OnCycleOf<Def, Ctx>
            : BaseOf<Def, Ctx>
        : BaseOf<Def, Ctx>

    type BaseOf<
        Def extends keyof Ctx["Ast"],
        Ctx extends Base.InferenceContext
    > = RootNode.InferAst<Ctx["Ast"][Def], Ctx & { Seen: { [K in Def]: true } }>

    type OnResolveOf<
        Def extends keyof Ctx["Ast"],
        Ctx extends Base.InferenceContext
    > = RootNode.InferAst<
        Ctx["Meta"]["onResolve"],
        {
            Dict: WithPropValue<Ctx["Dict"], "$resolution", Ctx["Dict"][Def]>
            Meta: Ctx["Meta"]
            Ast: WithPropValue<
                Ctx["Ast"],
                "$cyclic",
                Root.Parse<Ctx["Dict"][Def], Ctx["Dict"]>
            >
            Seen: Ctx["Seen"] & { [K in Def]: true }
        }
    >

    type OnCycleOf<
        Def extends keyof Ctx["Ast"],
        Ctx extends Base.InferenceContext
    > = RootNode.InferAst<
        Ctx["Meta"]["onCycle"],
        {
            Dict: WithPropValue<Ctx["Dict"], "$cyclic", Ctx["Dict"][Def]>
            Meta: Ctx["Meta"]
            Ast: WithPropValue<
                Ctx["Ast"],
                "$cyclic",
                Root.Parse<Ctx["Dict"][Def], Ctx["Dict"]>
            >
            Seen: {}
        }
    >
}

export class Alias extends TerminalNode {
    static matches(def: string, context: Base.context) {
        return !!context.space && def in context.space.dictionary
    }

    toString() {
        return this.definition
    }

    get resolution() {
        return this.context.space!.resolutions[this.definition]
    }

    check(state: Check.CheckState) {
        return this.resolution.check(state)
    }

    generate(state: Generate.GenerateState) {
        return this.resolution.generate(state)
    }
}
