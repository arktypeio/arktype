import { typeNode } from "./type.js"

export class voidNode extends typeNode {
    toString() {
        return "void"
    }

    allows(data: unknown) {
        return data === undefined
    }

    create(): void {}
}
