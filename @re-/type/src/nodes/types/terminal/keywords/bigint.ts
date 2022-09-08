import { typeNode } from "../type.js"

export class bigintNode extends typeNode {
    toString() {
        return "bigint"
    }

    allowsValue(value: unknown) {
        return typeof value === "bigint"
    }

    create(): bigint {
        return 0n
    }
}
