import type { Dictionary, JsType } from "../../internal.js"
import type { Bound } from "../expression/infix/bound.js"

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
}

type Composed = {
    branches?: Attributes[]
    props?: Dictionary<Attributes>
    values?: Attributes
}

type CompiledAttributes = Atomic & Composed

type AttributeName = keyof CompiledAttributes

type ParamsByName = {
    type: [JsType.NormalizedName]
    value: [unknown]
    regex: [RegExp]
    divisor: [number]
    bound: [Bound.Token, number]
    optional: []
}

type InputName = keyof ParamsByName

export class Attributes {
    private branches: CompiledAttributes[]

    constructor(private attributes: CompiledAttributes) {}

    get<Name extends AttributeName>(name: Name) {
        return this.attributes[name]
    }

    add<Name extends InputName>(name: Name, ...params: ParamsByName[Name]) {}

    forProp(key: string | number) {
        if (!this.attributes.props) {
            this.attributes.props = {}
        }
        if (!this.attributes.props[key]) {
            this.attributes.props[key] = new Attributes({})
        }
        return this.attributes.props[key]
    }

    branch() {
        if (!this.attributes.branches) {
            this.attributes.branches = [branchAttributes]
            return
        }
        this.attributes.branches.push(branchAttributes)
    }
}
