import { typeNode } from "./type.js"

export class voidNode extends typeNode {
    toString() {
        return "void"
    }

    allowsValue(value: unknown) {
        return value === undefined
    }

    create(): void {}
}
