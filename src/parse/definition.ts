import type { Node } from "../nodes/node.js"
import type { ScopeRoot } from "../scope.js"
import { dynamicTypeOf } from "../utils/dynamicTypes.js"
import type { dictionary, DynamicTypeName } from "../utils/dynamicTypes.js"
import { throwParseError } from "../utils/errors.js"
import type { error, evaluate, isAny, isTopType } from "../utils/generics.js"
import type { inferString, validateString } from "./string.js"
import { parseString } from "./string.js"
import type { inferStructure } from "./structure.js"
import { parseStructure } from "./structure.js"

export const parseDefinition = (def: unknown, scope: ScopeRoot): Node => {
    const defType = dynamicTypeOf(def)
    return defType === "string"
        ? parseString(def as string, scope)
        : defType === "dictionary" || defType === "array"
        ? parseStructure(def as any, scope)
        : throwParseError(buildBadDefinitionTypeMessage(defType))
}

export type inferDefinition<
    def,
    scope extends dictionary,
    aliases
> = isTopType<def> extends true
    ? never
    : def extends string
    ? inferString<def, scope, aliases>
    : def extends BadDefinitionType
    ? never
    : inferStructure<def, scope, aliases>

export type validateDefinition<
    def,
    scope extends dictionary
> = isTopType<def> extends true
    ? error<
          buildUninferableDefinitionMessage<
              isAny<def> extends true ? "any" : "unknown"
          >
      >
    : def extends []
    ? def
    : def extends string
    ? validateString<def, scope>
    : def extends BadDefinitionType
    ? buildBadDefinitionTypeMessage<dynamicTypeOf<def>>
    : evaluate<{
          [k in keyof def]: validateDefinition<def[k], scope>
      }>

type BadDefinitionType =
    | undefined
    | null
    | boolean
    | number
    | bigint
    | Function
    | symbol

export type buildUninferableDefinitionMessage<
    typeName extends "any" | "unknown"
> =
    `Cannot statically parse a definition inferred as ${typeName}. Use 'type.dynamic(...)' instead.`

export const buildBadDefinitionTypeMessage = <actual extends DynamicTypeName>(
    actual: actual
): buildBadDefinitionTypeMessage<actual> =>
    `Type definitions must be strings or objects (was ${actual})`

export type buildBadDefinitionTypeMessage<actual extends DynamicTypeName> =
    `Type definitions must be strings or objects (was ${actual})`
