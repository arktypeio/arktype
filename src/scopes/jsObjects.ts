import { TypeNode } from "../nodes/type.js"
import { Scope } from "../scope.js"

export const jsObject = Scope.root({
    Function: TypeNode({ basis: Function }),
    Date: TypeNode({ basis: Date }),
    Error: TypeNode({ basis: Error }),
    Map: TypeNode({ basis: Map }),
    RegExp: TypeNode({ basis: RegExp }),
    Set: TypeNode({ basis: Set }),
    WeakMap: TypeNode({ basis: WeakMap }),
    WeakSet: TypeNode({ basis: WeakSet }),
    Promise: TypeNode({ basis: Promise })
})

export const jsObjectTypes = jsObject.export()
