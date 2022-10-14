import type { MutuallyExclusiveProps } from "@re-/tools"
import type { LazyDynamicWrap } from "./internal.js"
import { lazyDynamicWrap } from "./internal.js"
import { Scope } from "./nodes/scope.js"
import type { inferAst } from "./nodes/traverse/ast/infer.js"
import type { validate } from "./nodes/traverse/ast/validate.js"
import type { Diagnostics } from "./nodes/traverse/diagnostics.js"
import type { ParseError } from "./parser/common.js"
import { Root } from "./parser/root.js"
import type { ResolvedSpace } from "./space.js"

const emptyAliases = { aliases: {} }
const rawTypeFn: DynamicTypeFn = (def, ctx) => {
    const root = Root.parse(def, emptyAliases)
    if (ctx) {
        return new Scope.Node(root, ctx)
    }
    return root
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
) => // TODO: Check objects?
Ast extends ParseError<string> ? never : Arktype<Inferred, Ast>

type DynamicTypeFn = (
    definition: unknown,
    options?: ArktypeOptions
) => DynamicArktype

export type TypeFn<Space extends ResolvedSpace = ResolvedSpace.Empty> =
    LazyDynamicWrap<InferredTypeFn<Space>, DynamicTypeFn>

export type Arktype<Inferred, Ast> = {
    infer: Inferred
    check: CheckFn<Inferred>
    assert: AssertFn<Inferred>
    toString(): string
    get ast(): Ast
    get definition(): unknown
}

export type DynamicArktype = Arktype<unknown, unknown>

export type ArktypeOptions = {
    errors?: {}
}

export type CheckFn<Inferred> = (data: unknown) => CheckResult<Inferred>

export type CheckResult<Inferred> = MutuallyExclusiveProps<
    { data: Inferred },
    {
        errors: Diagnostics
    }
>

export type AssertFn<Inferred> = (value: unknown) => Inferred
