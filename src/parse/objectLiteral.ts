import type { NamedPropRule } from "../nodes/composite/named.js"
import { predicateNode } from "../nodes/composite/predicate.js"
import { propsNode } from "../nodes/composite/props.js"
import { typeNode } from "../nodes/composite/type.js"
import { domainNode } from "../nodes/primitive/basis/domain.js"
import type { ParseContext } from "../scope.js"
import type { Ark } from "../scopes/ark.js"
import type { error } from "../utils/errors.js"
import type { evaluate } from "../utils/generics.js"
import type { Dict } from "../utils/records.js"
import type { validateString } from "./ast/ast.js"
import type { inferDefinition, validateDefinition } from "./definition.js"
import { Scanner } from "./string/shift/scanner.js"

export const parseObjectLiteral = (def: Dict, ctx: ParseContext) => {
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

export type inferObjectLiteral<def extends Dict, $> = evaluate<
    {
        [k in keyof def as nonOptionalKeyFrom<k, $>]: inferDefinition<def[k], $>
    } & {
        [k in keyof def as optionalKeyFrom<k>]?: inferDefinition<def[k], $>
    }
>

type nonOptionalKeyFrom<k, $> = parseKey<k> extends {
    kind: infer kind extends "required" | "indexed"
    value: infer value
}
    ? (kind extends "required" ? value : inferDefinition<value, $>) &
          PropertyKey
    : never

type optionalKeyFrom<k> = parseKey<k> extends {
    kind: "optional"
    value: infer value extends string
}
    ? value
    : never

// export type inferObjectLiteral<def extends Dict, $> = evaluate<{
//     [k in keyof def]: inferDefinition<def[k], $>
// }>

export type validateObjectLiteral<def, $> = {
    [k in keyof def]: k extends IndexedKey<infer indexDef>
        ? validateString<indexDef, $> extends error<infer message>
            ? message
            : inferDefinition<indexDef, $> extends PropertyKey
            ? // if the indexDef is syntactically and semantically valid,
              // move on to the validating the value definition
              validateDefinition<def[k], $>
            : writeInvalidPropertyKeyMessage<indexDef>
        : validateDefinition<def[k], $>
}

export const writeInvalidPropertyKeyMessage = <indexDef extends string>(
    indexDef: indexDef
): writeInvalidPropertyKeyMessage<indexDef> =>
    `Indexed key definition '${indexDef}' must be a string, number or symbol`

type writeInvalidPropertyKeyMessage<indexDef extends string> =
    `Indexed key definition '${indexDef}' must be a string, number or symbol`

type ParsedKeyKind = "required" | "optional" | "indexed"

type KeyParseResult = {
    kind: ParsedKeyKind
    value: string
}

export type IndexedKey<def extends string = string> = `[${def}]`

export type OptionalKey<name extends string = string> = `${name}?`

type parsedKey<result extends KeyParseResult> = result

type parseKey<k> = k extends OptionalKey<infer inner>
    ? inner extends `${infer baseName}${Scanner.EscapeToken}`
        ? parsedKey<{
              kind: "required"
              value: OptionalKey<baseName>
          }>
        : parsedKey<{
              kind: "optional"
              value: inner
          }>
    : k extends IndexedKey<infer def>
    ? parsedKey<{
          kind: "indexed"
          value: def
      }>
    : k extends `${Scanner.EscapeToken}${infer escapedIndexKey extends IndexedKey}`
    ? parsedKey<{
          kind: "required"
          value: escapedIndexKey
      }>
    : parsedKey<{
          kind: "required"
          value: k & string
      }>
