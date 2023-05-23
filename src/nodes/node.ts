import { type } from "../main.js"
import { CompiledFunction } from "../utils/compiledFunction.js"
import { Disjoint } from "./disjoint.js"

type Intersection<rule> = (l: rule, r: rule) => rule | Disjoint

type Base<rule> = ReturnType<typeof defineBase<rule>>

type Instance<rule> = InstanceType<Base<rule>>

const defineBase = <rule>(
    intersectRules: Intersection<rule>,
    create: (rule: rule) => any
) => {
    const intersections: {
        [lCondition: string]: {
            [rCondition: string]: Base<unknown> | Disjoint
        }
    } = {}

    abstract class BaseNode {
        abstract kind: string
        allows: (data: unknown) => boolean

        constructor(
            public rule: rule,
            public condition: string,
            public subconditions: string[]
        ) {
            this.allows = new CompiledFunction(`return ${condition}`)
        }

        intersect(other: this): this | Disjoint {
            if (this === (other as unknown)) {
                return this
            }
            if (intersections[this.condition][other.condition]) {
                return intersections[this.condition][other.condition] as never
            }
            const result = intersectRules(this.rule, other.rule)
            if (result instanceof Disjoint) {
                intersections[this.condition][other.condition] = result
                intersections[other.condition][this.condition] = result.invert()
                return result
            }
            const nodeResult = create(result)
            intersections[this.condition][other.condition] = nodeResult
            intersections[other.condition][this.condition] = nodeResult
            return nodeResult
        }
    }
    return BaseNode
}

export const defineNode = <rule, instance extends Instance<rule>>(
    compile: (rule: rule) => string[],
    intersect: Intersection<instance>,
    extend: (
        base: Base<rule>
    ) => new (...args: ConstructorParameters<Base<rule>>) => instance
) => {
    const instances: {
        [condition: string]: instance
    } = {}

    const create = (rule: rule): instance => {
        const subconditions = compile(rule)
        const condition = subconditions.join(" && ") ?? "true"
        if (instances[condition]) {
            return instances[condition]
        }
        const instance = extend(
            defineBase(intersect, create)
        ) as unknown as instance
        instances[condition] = instance
        return instance
    }
    return create
}
