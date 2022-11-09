import type {
    dictionary,
    DynamicTypeName
} from "../../../utils/dynamicTypes.js"
import type {
    keyOrKeySet,
    keyOrPartialKeySet,
    keySet,
    partialRecord,
    subtype
} from "../../../utils/generics.js"
import { isKeyOf, satisfies } from "../../../utils/generics.js"
import type { NumberLiteral } from "../../../utils/numericLiterals.js"
import { parseWellFormedInteger } from "../../../utils/numericLiterals.js"
import type { RegexLiteral } from "../../operand/enclosed.js"
import type { SerializedBounds } from "../../operator/bounds/serialization.js"
import {
    deserializeBounds,
    serializeBounds
} from "../../operator/bounds/serialization.js"
import type { DiscriminatedBranches } from "../../operator/union/discriminate.js"
import { operateAttribute } from "./operations.js"
import type { SerializedPrimitive } from "./value.js"
import { deserializePrimitive, serializePrimitive } from "./value.js"

type DisjointAttributeTypes = {
    value: SerializedPrimitive
    type: DynamicTypeName
}

type AdditiveAttributeTypes = {
    divisor: NumberLiteral
    bounds: SerializedBounds
}

type IrreducibleAttributeTypes = subtype<
    dictionary<keyOrKeySet<string>>,
    {
        regex: keyOrKeySet<RegexLiteral>
        requiredKeys: keySet<string>
        alias: keyOrKeySet<string>
        contradiction: keyOrKeySet<string>
    }
>

type ComposedAttributeTypes = {
    props: dictionary<AttributeState>
    branches: AttributeBranches
}

type ReducibleAttributeTypes = subtype<
    dictionary<string>,
    DisjointAttributeTypes & AdditiveAttributeTypes
>

type UndiscriminatedBranches = AttributeState[]

type IntersectedBranches = ["&", ...AttributeState[]]

export type AttributeBranches =
    | DiscriminatedBranches
    | UndiscriminatedBranches
    | IntersectedBranches

type AttributeTypes = ReducibleAttributeTypes &
    IrreducibleAttributeTypes &
    ComposedAttributeTypes

export type AttributeKey = keyof AttributeTypes

export type Attribute<k extends AttributeKey> = AttributeTypes[k]

export type Attributes = { [k in AttributeKey]?: Attribute<k> }

export class AttributeState {
    private a: Attributes = {}

    intersect<k extends AttributeKey>(k: k, v: Attribute<k>) {
        if (k === "branches") {
            return {}
        } else if (this.a[k] === undefined) {
            this.a[k] = v
            if (isKeyOf(k, impliedTypes)) {
                this.intersectTypeImplications(k)
            }
        } else {
            const result = (operateAttribute[k] as any)(this.a[k], v)
            if (result === null) {
                this.intersect(
                    "contradiction",
                    `${this.a[k]} and ${v} have an empty intersection`
                )
            } else {
                this.a[k] = result
            }
        }
    }

    eject() {
        return this.a
    }

    private intersectTypeImplications(key: TypeImplyingKey) {
        const impliedType = impliedTypes[key]
        if (typeof impliedType === "string") {
            return this.intersect("type", impliedType)
        }
        const impliedCases: { [k in DynamicTypeName]?: Attributes } = {}
        let k: DynamicTypeName
        for (k in impliedType) {
            impliedCases[k] = {}
        }
        this.intersect("branches", ["?", "", "type", impliedCases])
    }
}

const impliedTypes = satisfies<
    partialRecord<AttributeKey, keyOrPartialKeySet<DynamicTypeName>>
>()({
    divisor: "number",
    bounds: {
        number: true,
        string: true,
        array: true
    },
    regex: "string"
})

type TypeImplyingKey = keyof typeof impliedTypes

const serializers = satisfies<{
    [k in AttributeKey]?: (input: any) => Attribute<k>
}>()({
    divisor: (input: number) => `${input}`,
    bounds: serializeBounds,
    value: serializePrimitive
})

type Serializers = typeof serializers

type SerializedKey = keyof typeof serializers

const deserializers = satisfies<{
    [k in SerializedKey]: (
        serialized: ReturnType<Serializers[k]>
    ) => Parameters<Serializers[k]>[0]
}>()({
    divisor: (serialized) => parseWellFormedInteger(serialized, true),
    bounds: deserializeBounds,
    value: deserializePrimitive
})
