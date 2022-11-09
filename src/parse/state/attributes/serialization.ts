import { satisfies } from "../../../utils/generics.js"
import { parseWellFormedInteger } from "../../../utils/numericLiterals.js"
import {
    deserializeBounds,
    serializeBounds
} from "../../operator/bounds/serialization.js"
import type { Attribute, AttributeKey } from "./attributes.js"

import { deserializePrimitive, serializePrimitive } from "./value.js"

export const serializers = satisfies<{
    [k in AttributeKey]?: (input: any) => Attribute<k>
}>()({
    divisor: (input: number) => `${input}`,
    bounds: serializeBounds,
    value: serializePrimitive
})

type Serializers = typeof serializers

type SerializedKey = keyof typeof serializers

type DeserializedFormats = {
    [k in SerializedKey]: Parameters<Serializers[k]>[0]
}

export const deserializers = satisfies<{
    [k in SerializedKey]: (serialized: Attribute<k>) => DeserializedFormats[k]
}>()({
    divisor: (serialized) => parseWellFormedInteger(serialized, true),
    bounds: deserializeBounds,
    value: deserializePrimitive
})

export type DeserializedAttribute<k extends AttributeKey> =
    k extends SerializedKey ? DeserializedFormats[k] : Attribute<k>
