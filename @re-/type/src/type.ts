import type {
    Arktype,
    ArktypeOptions,
    DynamicArktype
} from "./nodes/roots/type.js"
import { ArktypeRoot } from "./nodes/roots/type.js"
import type { Ast } from "./nodes/traverse/ast.js"
import type { ParseError } from "./parser/common.js"
import { Root } from "./parser/root.js"
import type { ResolvedSpace } from "./space.js"

const emptyAliases = { aliases: {} }
const rawTypeFn: DynamicTypeFn = (def, ctx = {}) => {
    const root = Root.parse(def, emptyAliases)
    return new ArktypeRoot(root, ctx, {})
}

const lazyTypeFn: DynamicTypeFn = (def, opts) => {
    let cache: any
    return new Proxy(
        {},
        {
            get: (_, k) => {
                if (!cache) {
                    cache = rawTypeFn(def, opts)
                }
                return cache[k]
            }
        }
    ) as any
}

export type InferredTypeFn<Space extends ResolvedSpace> = <
    Definition,
    ParseResult = Root.Parse<Definition, Space>,
    Inferred = Ast.Infer<ParseResult, Space["resolutions"]>
>(
    definition: Root.Validate<Definition, ParseResult>,
    options?: ArktypeOptions
) => ParseResult extends ParseError<string>
    ? never
    : Arktype<Inferred, ParseResult>

type DynamicTypeFn = (
    definition: unknown,
    options?: ArktypeOptions
) => DynamicArktype

export type TypeFn<Space extends ResolvedSpace = ResolvedSpace.Empty> =
    InferredTypeFn<Space> & {
        dynamic: DynamicTypeFn
        lazy: InferredTypeFn<Space>
        lazyDynamic: DynamicTypeFn
    }

export const type: TypeFn = rawTypeFn as any
// TODO: Abstract these variants as wrapper, reuse for space
type.dynamic = rawTypeFn
type.lazy = lazyTypeFn as any
type.lazyDynamic = lazyTypeFn
