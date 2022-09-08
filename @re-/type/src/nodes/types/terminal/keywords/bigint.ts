import { typeNode } from "./type.js"

export class bigintNode extends typeNode {
    toString() {
        return "bigint"
    }

    allowsValue(data: unknown) {
        return typeof data === "bigint"
    }

    create(): bigint {
        return 0n
    }
}
