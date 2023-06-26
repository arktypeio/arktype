import type {
    evaluate,
    List,
    NumberLiteral,
    Thunk
} from "../../../dev/utils/src/main.js"
import type {
    IndexedPropInput,
    NonVariadicIndexMatcherLiteral,
    VariadicIndexMatcherLiteral
} from "./indexed.js"
import type { PropValueInput } from "./named.js"
import type { NamedPropsInput, PropsInput, PropsInputTuple } from "./props.js"
import type { inferTypeInput, TypeInput, TypeNode } from "./type.js"

export type inferPropsInput<input extends PropsInput> =
    input extends PropsInputTuple<infer named, infer indexed>
        ? inferIndexed<indexed, inferNamedProps<named, indexed>>
        : input extends NamedPropsInput
        ? inferNamedProps<input, []>
        : never

type inferIndexed<
    indexed extends readonly IndexedPropInput[],
    result = unknown
> = indexed extends readonly [
    infer entry extends IndexedPropInput,
    ...infer tail extends IndexedPropInput[]
]
    ? inferIndexed<
          tail,
          entry["key"] extends { readonly regex: VariadicIndexMatcherLiteral }
              ? result extends List
                  ? [...result, ...inferTypeInput<entry["value"]>[]]
                  : never
              : entry["key"] extends {
                    readonly regex: NonVariadicIndexMatcherLiteral
                }
              ? inferTypeInput<entry["value"]>[]
              : Record<
                    Extract<inferTypeInput<entry["key"]>, PropertyKey>,
                    inferTypeInput<entry["value"]>
                >
      >
    : result

type inferNamedProps<
    named extends NamedPropsInput,
    indexed extends readonly IndexedPropInput[]
> = [named, indexed[0]["key"]] extends
    | [TupleLengthProps, unknown]
    | [unknown, { readonly regex: VariadicIndexMatcherLiteral }]
    ? inferNonVariadicTupleProps<named> &
          inferObjectLiteralProps<
              Omit<named, "length" | NumberLiteral | number>
          >
    : inferObjectLiteralProps<named>

type inferObjectLiteralProps<named extends NamedPropsInput> = {} extends named
    ? unknown
    : evaluate<
          {
              [k in requiredKeyOf<named>]: inferPropValue<named[k]["value"]>
          } & {
              [k in optionalKeyOf<named>]?: inferPropValue<named[k]["value"]>
          }
      >

type inferPropValue<value extends PropValueInput> = value extends Thunk<
    infer ret
>
    ? inferResolvedPropValue<ret>
    : inferResolvedPropValue<value>

type inferResolvedPropValue<value> = value extends TypeNode<infer t>
    ? t
    : inferTypeInput<Extract<value, TypeInput>>

type stringifiedNumericKeyOf<t> = `${Extract<keyof t, number | NumberLiteral>}`

type inferNonVariadicTupleProps<
    named extends NamedPropsInput,
    result extends unknown[] = []
> = `${result["length"]}` extends stringifiedNumericKeyOf<named>
    ? inferNonVariadicTupleProps<
          named,
          [...result, inferPropValue<named[`${result["length"]}`]["value"]>]
      >
    : result

type TupleLengthProps<length extends number = number> = {
    readonly length: {
        readonly prerequisite: true
        readonly value: { readonly basis: readonly ["===", length] }
    }
}

type requiredKeyOf<input extends NamedPropsInput> = Exclude<
    keyof input,
    optionalKeyOf<input>
>

type optionalKeyOf<input extends NamedPropsInput> = {
    [k in keyof input]: input[k]["optional"] extends true ? k : never
}[keyof input]
