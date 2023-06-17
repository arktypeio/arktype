import type { NamedPropRule } from "../nodes/composite/named.js"
import { predicateNode } from "../nodes/composite/predicate.js"
import { propsNode } from "../nodes/composite/props.js"
import { typeNode } from "../nodes/composite/type.js"
import { domainNode } from "../nodes/primitive/basis/domain.js"
import type { ParseContext } from "../scope.js"
import type { evaluate } from "../utils/generics.js"
import type { Dict } from "../utils/records.js"
import type { inferDefinition } from "./definition.js"
import { Scanner } from "./string/shift/scanner.js"
import type { inferString } from "./string/string.js"

export const parseRecord = (def: Dict, ctx: ParseContext) => {
    const named: NamedPropRule[] = []
    for (const definitionKey in def) {
        let keyName = definitionKey
        let optional = false
        if (definitionKey[definitionKey.length - 1] === "?") {
            if (
                definitionKey[definitionKey.length - 2] === Scanner.escapeToken
            ) {
                keyName = `${definitionKey.slice(0, -2)}?`
            } else {
                keyName = definitionKey.slice(0, -1)
                optional = true
            }
        }
        ctx.path.push(keyName)
        named.push({
            key: {
                name: keyName,
                prerequisite: false,
                optional
            },
            value: ctx.scope.parse(def[definitionKey], ctx)
        })
        ctx.path.pop()
    }
    const props = propsNode(named)
    const predicate = predicateNode([objectBasisNode, props])
    return typeNode([predicate])
}

const objectBasisNode = domainNode("object")

export type inferRecord<def extends Dict, $> = evaluate<
    {
        [k in keyof def as parseKey<k> extends {
            kind: infer kind extends "required" | "indexed"
            value: infer value
        }
            ? (kind extends "required" ? value : inferDefinition<value, $>) &
                  PropertyKey
            : never]: inferDefinition<def[k], $>
    } & {
        [k in keyof def as parseKey<k> extends {
            kind: "optional"
            value: infer value extends string
        }
            ? value
            : never]?: inferDefinition<def[k], $>
    }
>

type ParsedKeyKind = "required" | "optional" | "indexed"

type KeyParseResult = {
    kind: ParsedKeyKind
    value: string
}

type parsedKey<result extends KeyParseResult> = result

type parseKey<k> = k extends `${infer name}?`
    ? name extends `${infer baseName}${Scanner.EscapeToken}`
        ? parsedKey<{
              kind: "required"
              value: `${baseName}?`
          }>
        : parsedKey<{
              kind: "optional"
              value: name
          }>
    : k extends `[${infer index}]`
    ? parsedKey<{
          kind: "indexed"
          value: index
      }>
    : k extends `${Scanner.EscapeToken}[${infer baseName}]`
    ? parsedKey<{
          kind: "required"
          value: `[${baseName}]`
      }>
    : parsedKey<{
          kind: "required"
          value: k & string
      }>
