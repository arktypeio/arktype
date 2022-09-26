import type { ClassOf, InstanceOf } from "@re-/tools"
import { isEmpty } from "@re-/tools"
import type { Base } from "../../../nodes/base.js"
import type { ParseError } from "../../common.js"
import { parseError } from "../../common.js"
import type { UnclosedGroupMessage } from "../operand/groupOpen.js"
import { unclosedGroupMessage } from "../operand/groupOpen.js"
import type { MergeBranches } from "../operator/binary/branch.js"
import { mergeBranches } from "../operator/binary/branch.js"
import type { UnpairedLeftBoundMessage } from "../operator/unary/bound/right.js"
import { unpairedLeftBoundMessage } from "../operator/unary/bound/right.js"
import type { Left } from "./left.js"
import { left } from "./left.js"
import type { Scanner } from "./scanner.js"
import { scanner } from "./scanner.js"

export class parserState<constraints extends Partial<left> = {}> {
    l: left<constraints>
    r: scanner

    constructor(def: string) {
        this.l = left.initialize() as left<constraints>
        this.r = new scanner(def)
    }

    error(message: string): never {
        throw new parseError(message)
    }

    hasRoot<NodeClass extends ClassOf<Base.node> = ClassOf<Base.node>>(
        ofClass?: NodeClass
    ): this is parserState<{ root: InstanceOf<NodeClass> }> {
        return ofClass ? this.l.root instanceof ofClass : !!this.l.root
    }

    isPrefixable() {
        return (
            !this.l.lowerBound &&
            isEmpty(this.l.branches) &&
            !this.l.groups.length
        )
    }

    isSuffixable(): this is parserState<left.suffixable> {
        return !!this.l.nextSuffix
    }

    suffixed(token: Scanner.Suffix) {
        this.l.nextSuffix = token
        return this
    }

    shifted() {
        this.r.shift()
        return this
    }
}

export namespace parserState {
    export type suffix<Constraints extends Partial<left.suffix> = {}> =
        parserState<left.suffix<Constraints>>

    export type withRoot<Root extends Base.node = Base.node> = parserState<
        left.withRoot<Root>
    >

    export const finalize = (s: parserState.suffix) =>
        !s.l.groups.length
            ? !s.l.lowerBound
                ? mergeBranches(s)
                : s.error(unpairedLeftBoundMessage)
            : s.error(unclosedGroupMessage)
}

export type ParserState<Constraints extends Partial<Left> = {}> = {
    L: Left & Constraints
    R: string
}

export namespace ParserState {
    export type New<Def extends string> = From<{
        L: Left.New
        R: Def
    }>

    export type Of<L extends Left> = {
        L: L
        R: string
    }

    export type With<Constraints extends Partial<Left>> = {
        L: Left & Constraints
        R: string
    }

    export type From<S extends ParserState> = S

    export type Error<Message extends string> = {
        L: Left.Error<Message>
        R: ""
    }

    export type WithRoot<Root = {}> = Of<Left.WithRoot<Root>>

    export type Suffixable = {
        L: {
            nextSuffix: string
        }
    }
}
