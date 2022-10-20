import { chainableNoOpProxy } from "@arktype/tools"
import type { LazyDynamicWrap } from "./internal.js"
import { lazyDynamicWrap } from "./internal.js"
import type { inferAst } from "./nodes/ast/infer.js"
import type { validate } from "./nodes/ast/validate.js"
import type { Base } from "./nodes/base/base.js"
import { Traversal } from "./nodes/base/traversal.js"
import { Scope } from "./nodes/expression/infix/scope.js"
import type { ParseError } from "./parser/common.js"
import { Root } from "./parser/root.js"
import type { ArktypeSpace, ResolvedSpace } from "./space.js"

const emptyAliases = { aliases: {} }
const rawTypeFn: DynamicTypeFn = (def, ctx) => {
    const root = Root.parse(def, emptyAliases)
    if (ctx) {
        return new Arktype(new Scope(root, ctx))
    }
    return new Arktype(root)
}

export const type: TypeFn = lazyDynamicWrap<
    InferredTypeFn<ResolvedSpace.Empty>,
    DynamicTypeFn
>(rawTypeFn)

export type InferredTypeFn<Space extends ResolvedSpace> = <
    Definition,
    Ast = Root.parse<Definition, Space>,
    Inferred = inferAst<Ast, Space["resolutions"]>
>(
    definition: validate<Definition, Ast, Space["resolutions"]>,
    options?: ArktypeOptions
) => Ast extends ParseError<string> ? never : Arktype<Inferred, Ast>

type DynamicTypeFn = (definition: unknown, options?: ArktypeOptions) => Arktype

export type TypeFn<Space extends ResolvedSpace = ResolvedSpace.Empty> =
    LazyDynamicWrap<InferredTypeFn<Space>, DynamicTypeFn>

export class Arktype<Inferred = unknown, Ast = unknown> {
    constructor(public root: Base.Node, public space?: ArktypeSpace) {}

    infer(): Inferred {
        return chainableNoOpProxy
    }

    check(data: unknown) {
        const state = new Traversal(data)
        this.root.traverse(state)
        return state.problems.length
            ? {
                  problems: state.problems
              }
            : { data: data as Inferred }
    }

    assert(data: unknown) {
        const result = this.check(data)
        result.problems?.throw()
        return result.data as Inferred
    }

    toString() {
        return this.root.toString()
    }

    get ast() {
        return this.root.ast as Ast
    }

    get definition() {
        return this.root.definition
    }
}

export type ArktypeOptions = {
    errors?: {}
}
