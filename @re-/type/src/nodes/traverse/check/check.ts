import type { JsBuiltinTypes, JsTypeName } from "@re-/tools"
import { toString } from "@re-/tools"
import type { TraverseContext } from "../traverse.js"
import { createTraverseContext } from "../traverse.js"
import type { CustomValidator } from "./customValidator.js"
import type { OptionsByDiagnostic } from "./diagnostics.js"
import { Diagnostics } from "./diagnostics.js"

export type CheckArgs<Data = unknown> = {
    data: Data
    diagnostics: Diagnostics
    cfg: CheckOptions
    context: CheckContext
}

export const createCheckArgs = (
    data: unknown,
    options: CheckOptions = {},
    modelOptions: CheckOptions = {}
): CheckArgs => {
    const args = {
        data,
        diagnostics: new Diagnostics(),
        context: createTraverseContext(modelOptions) as CheckContext,
        cfg: options
    }
    args.context.checkedValuesByAlias = {}
    return args
}

export type CheckOptions = {
    validator?: CustomValidator | "default"
    diagnostics?: OptionsByDiagnostic
}

export type CheckContext = TraverseContext<CheckOptions> & {
    checkedValuesByAlias: Record<string, object[]>
}

export const dataIsOfType = <TypeName extends JsTypeName>(
    args: CheckArgs,
    typeName: TypeName
): args is CheckArgs<JsBuiltinTypes[TypeName]> => typeof args.data === typeName

export const stringifyData = (data: unknown) =>
    toString(data, {
        maxNestedStringLength: 50
    })
