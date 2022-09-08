import { typeNode } from "./type.js"

export class voidNode extends typeNode {
    toString() {
        return "void"
    }

    allowsValue(data: unknown) {
        return data === undefined
    }

    create(): void {}
}
