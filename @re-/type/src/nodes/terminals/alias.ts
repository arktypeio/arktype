import type { Get } from "@re-/tools"
import type { Root } from "../../index.js"
import type { Space } from "../../space.js"
import type { Base } from "../base.js"
import type { Check, Generate } from "../traverse/exports.js"
import { TerminalNode } from "./terminal.js"

// TODO: Fix name for DEfinitions
export type AliasAst<
    Alias extends Space.AliasOf<Definitions>,
    Definitions
> = "onResolve" extends Space.RootOf<Definitions>
    ? Alias extends "$resolution"
        ? Definitions[Alias]
        : Root.Parse<
              Get<Space.RootOf<Definitions>, "onResolve">,
              Space.DefinitionsOf<Definitions> & { $resolution: Alias }
          >
    : Alias

export class Alias extends TerminalNode {
    static matches(def: string, context: Base.context) {
        return !!context.space && def in context.space.definitions
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
