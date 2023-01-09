import type { Identifier, TraversalNode, TypeRoot } from "./nodes/node.ts"
import type { inferDefinition, validateDefinition } from "./parse/definition.ts"
import type { Scope } from "./scope.ts"
import type { CheckConfig } from "./traverse/check.ts"
import { rootCheck } from "./traverse/check.ts"
import type { Problems } from "./traverse/problems.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type {
    defer,
    Dict,
    evaluate,
    isTopType,
    merge,
    parametersOf,
    returnOf,
    xor
} from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

export const nodeToType = (
    root: TypeRoot,
    flat: TraversalNode,
    $: Scope,
    config: Traits
): Type => {
    return Object.assign(
        (data: unknown) => {
            return rootCheck(data, flat, $, config)
        },
        {
            config,
            infer: chainableNoOpProxy,
            root,
            flat
        }
    ) as any
}

export const isType = (value: {}): value is Type =>
    (value as Type).infer === chainableNoOpProxy

export type InferredTypeParser<$> = {
    <def>(def: validateDefinition<def, $>): parseType<def, $, {}>

    <def, traits extends Traits<inferDefinition<def, $>, $>>(
        def: validateDefinition<def, $>,
        traits: traits
    ): parseType<def, $, morphsFrom<traits>>
}

export type parseType<
    def,
    $,
    morphs extends Morphs
> = isTopType<def> extends true
    ? never
    : def extends validateDefinition<def, $>
    ? {} extends morphs
        ? Type<inferDefinition<def, $>>
        : Morphable<inferDefinition<def, $>, morphs>
    : never

export type Traits<data = unknown, $ = Dict> = Morphs<data, $> & CheckConfig

export type Morphs<data = unknown, $ = Dict> = {
    in?: Sources<$>
    out?: Targets<data, $>
}

export type Sources<$> =
    | Preprocessor
    | ({
          [name in Identifier<$>]?: Preprocessor<inferDefinition<name, $>>
      } & { [name in string]: Preprocessor })

type Preprocessor<input = never> = (input: input) => unknown

export type Targets<data, $> =
    | Postprocessor<data>
    | ({
          [name in Identifier<$>]?: Postprocessor<
              data,
              inferDefinition<name, $>
          >
      } & {
          [name in string]: Postprocessor<data>
      })

type Postprocessor<data, output = unknown> = (data: data) => output

export type morphsFrom<traits> = evaluate<
    (traits extends { in: {} }
        ? {
              in: traits["in"] extends Preprocessor<infer input>
                  ? { default: input }
                  : {
                        [name in keyof traits["in"]]: parametersOf<
                            traits["in"][name]
                        >[0]
                    }
          }
        : {}) &
        (traits extends { out: {} }
            ? {
                  out: traits["out"] extends Postprocessor<never, infer output>
                      ? { out: output }
                      : {
                            [name in keyof traits["out"]]: returnOf<
                                traits["out"][name]
                            >
                        }
              }
            : {})
>

type DynamicTypeParser = (def: unknown, traits?: Traits) => Morphable

export type TypeParser<$> = LazyDynamicWrap<
    InferredTypeParser<$>,
    DynamicTypeParser
>

export type Result<output> = xor<output, { problems: Problems }>

export type Checker<output> = (data: unknown) => Result<output>

// TODO: Rename
export type TypeMetadata<data = unknown> = {
    infer: data
    root: TypeRoot
    flat: TraversalNode
}

export type Type<data = unknown> = defer<
    Checker<{ data: data }> & TypeMetadata<data>
>

export type Morphable<data = unknown, morphs extends Morphs = Morphs> = defer<
    Checker<outputFrom<data, morphs>> &
        TypeMetadata<data> &
        inputFrom<data, morphs>
>

type outputFrom<data, morphs extends Morphs> = morphs["out"] extends {}
    ? merge<{ data: data }, morphs["out"]>
    : { data: data }

type inputFrom<data, morphs extends Morphs> = morphs["in"] extends {}
    ? {
          from: (morphs["in"] extends { default: infer input }
              ? (input: input) => Result<outputFrom<data, morphs>>
              : {}) &
              (<k extends keyof morphs["in"]>(
                  key: k,
                  input: morphs["in"][k]
              ) => Result<outputFrom<data, morphs>>)
      }
    : {}
