import type { evaluate } from "../../../utils/generics.js"
import type { List } from "../../../utils/lists.js"
import type { NumberLiteral } from "../../../utils/numericLiterals.js"
import type { Key } from "../../../utils/records.js"
import type { inferTypeInput } from "../../type.js"
import type {
    IndexedInputEntry,
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
    indexed extends IndexedInputEntry[],
    result = unknown
> = indexed extends [
    infer entry extends IndexedInputEntry,
    ...infer tail extends IndexedInputEntry[]
]
    ? inferIndexed<
          tail,
          entry[0] extends { readonly regex: VariadicIndexMatcherSource }
              ? result extends List
                  ? [...result, ...inferTypeInput<entry[1]>[]]
                  : never
              : entry[0] extends {
                    readonly regex: NonVariadicIndexMatcherSource
                }
              ? inferTypeInput<entry[1]>[]
              : Record<
                    Extract<inferTypeInput<entry[0]>, Key>,
                    inferTypeInput<entry[1]>
                >
      >
    : result

type inferNamedProps<
    named extends NamedPropsInput,
    indexed extends IndexedInputEntry[]
> = [named, indexed[0][0]] extends
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
        readonly kind: "prerequisite"
        readonly value: { readonly basis: readonly ["===", length] }
    }
}

type requiredKeyOf<input extends NamedPropsInput> = Exclude<
    keyof input,
    optionalKeyOf<input>
>

type optionalKeyOf<input extends NamedPropsInput> = {
    [k in keyof input]: input[k]["kind"] extends "optional" ? k : never
}[keyof input]
