import type { evaluate, List, NumberLiteral, Thunk } from "@arktype/utils"
import type { inferTypeInput, TypeInput } from "../parse.js"
import type { TypeNode } from "../type.js"
import type {
    IndexedPropInput,
    NonVariadicIndexMatcherLiteral,
    VariadicIndexMatcherLiteral
} from "./indexed.js"
import type { PropValueInput } from "./named.js"
import type { NamedPropsInput, PropsInputTuple } from "./properties.js"

export type PropsInput = NamedPropsInput | PropsInputTuple

// export const isParsedPropsRule = (
//     input: PropsInput | PropsEntries
// ): input is PropsEntries =>
//     isArray(input) && (input.length === 0 || hasArkKind(input[0].value, "node"))

// const parsePropsInput = (input: PropsInput, meta: PropsMeta) => {
//     const [namedInput, ...indexedInput] = isArray(input) ? input : [input]
//     const entries: NodeEntry[] = []
//     for (const name in namedInput) {
//         const prop = namedInput[name]
//         entries.push({
//             key: {
//                 name,
//                 prerequisite: prop.prerequisite ?? false,
//                 optional: prop.optional ?? false
//             },
//             value: hasArkKind(prop.value, "node")
//                 ? prop.value
//                 : typeNode(prop.value, meta)
//         })
//     }
//     for (const prop of indexedInput) {
//         entries.push({
//             key: typeNode(prop.key, meta),
//             value: typeNode(prop.value, meta)
//         })
//     }
//     return entries
// }

// export const parse = (input, meta) => {
//     // TODO: better strategy for sorting
//     const rule = isParsedPropsRule(input) ? input : parsePropsInput(input, meta)
//     return [...rule].sort((l, r) => {
//         // Sort keys first by precedence (prerequisite,required,optional,indexed),
//         // then alphebetically by key
//         const lPrecedence = kindPrecedence(l.key)
//         const rPrecedence = kindPrecedence(r.key)
//         return lPrecedence > rPrecedence
//             ? 1
//             : lPrecedence < rPrecedence
//             ? -1
//             : keyNameToString(l.key) > keyNameToString(r.key)
//             ? 1
//             : -1
//     })
// }

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
