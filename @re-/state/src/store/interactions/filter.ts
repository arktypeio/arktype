import { FindArgs, InteractionContext } from "./common.js"
import { all } from "./all.js"
import { diff, ObjectDiffResult } from "@re-/tools"

export const filter = (
    typeName: string,
    by: FindArgs<any>,
    ctx: InteractionContext
) => {
    const list = all(typeName, ctx)
    if (typeof by === "function") {
        return list.filter(by as any)
    }
    return list.filter((item) => {
        const changes = diff(by, item, {
            excludeAdded: true
        }) as ObjectDiffResult<any, any>
        return changes.changed || changes.removed
    })
}
