import type { DynamicTypeName } from "../../../utils/dynamicTypes.js"
import type {
    keyOrPartialKeySet,
    partialRecord
} from "../../../utils/generics.js"
import { isKeyOf, satisfies } from "../../../utils/generics.js"
import { throwInternalError } from "../../../utils/internalArktypeError.js"
import type {
    Attribute,
    AttributeKey,
    Attributes,
    ReadonlyAttributes
} from "./attributes.js"
import { operateAttribute } from "./operations.js"

export class AttributeState<attributes extends Attributes = Attributes> {
    private a: Attributes = unsetProxy

    get: attributes & ReadonlyAttributes = this.a as any

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

    isUnset() {
        return this.a === unsetProxy
    }

    reinitialize(attributes: Attributes) {
        if (!this.isUnset()) {
            return throwInternalError(
                `Unexpected attempt to reinitialize existing attributes.`
            )
        }
        this.a = attributes
    }

    eject() {
        if (this.isUnset()) {
            return throwInternalError(
                `Unexpected attempt to eject unset attributes.`
            )
        }
        const attributes = this.a
        this.a = unsetProxy as any
        return attributes as any as attributes
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

const unsetProxy = new Proxy(
    {},
    {
        get: () =>
            throwInternalError(`Unexpected attempt to access unset attributes.`)
    }
)
