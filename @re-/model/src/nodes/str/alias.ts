import { And, Get, WithPropValue } from "@re-/tools"
import type { MetaKey } from "../../space.js"
import { Resolution } from "../resolution.js"
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
        !!ctx.space && def in ctx.space.dictionary

    export class Node extends Base.Leaf<string> {
        resolution = new Resolution.Node(this.def, this.ctx)

        allows(args: Base.Validation.Args) {
            return this.resolution.allows(args)
        }

        generate(args: Base.Create.Args) {
            return this.resolution.generate(args)
        }
    }
}
