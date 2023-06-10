import type { evaluate } from "../../../utils/generics.js"
import type { List } from "../../../utils/lists.js"
import type { NumberLiteral } from "../../../utils/numericLiterals.js"
import type { inferTypeInput } from "../../type.js"
import type {
    IndexedPropInput,
    NonVariadicIndexMatcherSource,
    VariadicIndexMatcherSource
} from "./indexed.js"
import type { NamedPropsInput, PropsInput, PropsInputTuple } from "./props.js"

export type inferPropsInput<input extends PropsInput> =
    input extends PropsInputTuple<infer named, infer indexed>
        ? inferIndexed<indexed, inferNamedProps<named, indexed>>
        : input extends NamedPropsInput
        ? inferNamedProps<input, []>
        : never

type inferIndexed<
    indexed extends IndexedPropInput[],
    result = unknown
> = indexed extends [
    infer entry extends IndexedPropInput,
    ...infer tail extends IndexedPropInput[]
]
    ? inferIndexed<
          tail,
          entry["key"] extends { readonly regex: VariadicIndexMatcherSource }
              ? result extends List
                  ? [...result, ...inferTypeInput<entry["value"]>[]]
                  : never
              : entry["key"] extends {
                    readonly regex: NonVariadicIndexMatcherSource
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
    indexed extends IndexedPropInput[]
> = [named, indexed[0]["key"]] extends
    | [TupleLengthProps, unknown]
    | [unknown, { readonly regex: VariadicIndexMatcherSource }]
    ? inferNonVariadicTupleProps<named> &
          inferObjectLiteralProps<
              Omit<named, "length" | NumberLiteral | number>
          >
    : inferObjectLiteralProps<named>

type inferObjectLiteralProps<named extends NamedPropsInput> = {} extends named
    ? unknown
    : evaluate<
          {
              [k in requiredKeyOf<named>]: inferTypeInput<named[k]["value"]>
          } & {
              [k in optionalKeyOf<named>]?: inferTypeInput<named[k]["value"]>
          }
      >

type stringifiedNumericKeyOf<t> = `${Extract<keyof t, number | NumberLiteral>}`

type inferNonVariadicTupleProps<
    named extends NamedPropsInput,
    result extends unknown[] = []
> = `${result["length"]}` extends stringifiedNumericKeyOf<named>
    ? inferNonVariadicTupleProps<
          named,
          [...result, inferTypeInput<named[`${result["length"]}`]["value"]>]
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
