import type { Dictionary, JsType } from "../internal.js"
import type { Bound } from "../nodes/expression/infix/bound.js"

type Atomic = {
    type?: JsType.NormalizedName
    value?: unknown
    // TODO: Multiple regex
    regex?: RegExp
    divisor?: number
    min?: number
    inclusiveMin?: true
    max?: number
    inclusiveMax?: true
    optional?: true
    config?: Dictionary
}

type Composed = {
    branches?: Attributes[]
    props?: Dictionary<Attributes>
    values?: Attributes
}

type RawAttributes = Atomic & Composed

type AttributeName = keyof RawAttributes

type ParamsByName = {
    type: [JsType.NormalizedName]
    value: [unknown]
    regex: [RegExp]
    divisor: [number]
    bound: [Bound.Token, number]
    optional: []
    config: [Dictionary]
}

type InputName = keyof ParamsByName

export class Attributes {
    private branches?: RawAttributes[]

    constructor(private attributes: RawAttributes) {}

    get<Name extends AttributeName>(name: Name) {
        return this.attributes[name]
    }

    add<Name extends InputName>(name: Name, ...params: ParamsByName[Name]) {}

    addProp(key: string | number) {
        if (!this.attributes.props) {
            this.attributes.props = {}
        }
        if (!this.attributes.props[key]) {
            this.attributes.props[key] = new Attributes({})
        }
        return this.attributes.props[key]
    }

    branch() {
        if (!this.branches) {
            this.branches = []
        }
        this.branches.push(this.attributes)
        this.attributes = {}
    }
}
