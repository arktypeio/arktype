import type { Dictionary, JsType } from "../../internal.js"

type Atomic = {
    type: JsType.NormalizedName
    value: unknown
    // TODO: Multiple regex
    regex: RegExp
    divisor: number
    min: number
    inclusiveMin: true
    max: number
    inclusiveMax: true
}

type AtomicName = keyof Atomic

type Composed = {
    branches: Attributes[]
    props: Dictionary<Attributes>
    values: Attributes
}

type All = Atomic & Composed

type AttributeName = keyof All

export class Attributes {
    private attributes: Partial<All> = {}

    get<Name extends AttributeName>(name: Name) {
        return this.attributes[name]
    }

    add<Name extends AtomicName>(name: Name, value: Atomic[Name]) {
        this.attributes[name] = value
    }

    forProp(key: string | number) {
        if (!this.attributes.props) {
            this.attributes.props = {}
        }
        if (!this.attributes.props[key]) {
            this.attributes.props[key] = new Attributes()
        }
        return this.attributes.props[key]
    }
}
