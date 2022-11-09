import type { DynamicTypeName } from "../../../utils/dynamicTypes.js"
import type {
    keyOrPartialKeySet,
    partialRecord
} from "../../../utils/generics.js"
import { isKeyOf, satisfies } from "../../../utils/generics.js"
import { throwInternalError } from "../../../utils/internalArktypeError.js"
import type { AttributeKey, Attributes } from "./attributes.js"
import { operateAttribute } from "./operations.js"
import type { DeserializedAttribute } from "./serialization.js"
import { serializers } from "./serialization.js"

export class AttributeState {
    private a: Attributes = {}

    intersect<k extends AttributeKey>(k: k, v: DeserializedAttribute<k>) {
        if (k === "branches") {
            return {}
        } else if (this.a[k] === undefined) {
            this.a[k] = isKeyOf(k, serializers)
                ? serializers[k](v as any)
                : (v as any)
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
        const attributes = this.a
        this.a = ejectedProxy
        return attributes
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

const ejectedProxy = new Proxy(
    {},
    {
        get: () =>
            throwInternalError(
                `Unexpected attempt to access ejected attributes.`
            )
    }
)
