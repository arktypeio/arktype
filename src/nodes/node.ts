import { CompiledFunction } from "../utils/compiledFunction.js"
import { Disjoint } from "./disjoint.js"

const intersections: {
    [kind: string]: {
        [lCondition: string]: {
            [rCondition: string]: BaseNode<unknown> | Disjoint
        }
    }
} = {}

export abstract class BaseNode<rule> {
    abstract kind: string
    allows: (data: unknown) => boolean

    constructor(
        public rule: rule,
        public condition: string,
        public subconditions: string[],
        public create: (rule: rule) => any
    ) {
        this.allows = new CompiledFunction(`return ${condition}`)
    }

    abstract computeIntersection(other: this): rule | Disjoint

    intersect(other: this): this | Disjoint {
        if (this === (other as unknown)) {
            return this
        }
        if (intersections[this.kind][this.condition][other.condition]) {
            return intersections[this.kind][this.condition][
                other.condition
            ] as never
        }
        const result = this.computeIntersection(other)
        if (result instanceof Disjoint) {
            intersections[this.kind][this.condition][other.condition] = result
            intersections[this.kind][other.condition][this.condition] =
                result.invert()
            return result
        }
        const nodeResult = this.create(result)
        intersections[this.kind][this.condition][other.condition] = nodeResult
        intersections[this.kind][other.condition][this.condition] = nodeResult
        return nodeResult
    }
}

export const defineNode = <rule, instance extends BaseNode<rule>>(
    node: (new (
        ...args: ConstructorParameters<typeof BaseNode<rule>>
    ) => instance) & {
        compile(rule: rule): string[]
    }
) => {
    const instances: {
        [condition: string]: instance
    } = {}

    const create = (rule: rule): instance => {
        const subconditions = node.compile(rule)
        const condition = subconditions.join(" && ") ?? "true"
        if (instances[condition]) {
            return instances[condition]
        }
        const instance = new node(rule, condition, subconditions, create)
        instances[condition] = instance
        return instance
    }
    return create
}
