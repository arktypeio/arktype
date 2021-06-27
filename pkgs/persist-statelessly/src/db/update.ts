import { FindBy, FileDbContext, Model, KeyName } from "./common"
import { DeepUpdate, updateMap } from "@re-do/utils"

export const update = <T extends Model>(
    typeName: KeyName<T>,
    where: FindBy<any>,
    update: DeepUpdate<any>,
    context: FileDbContext<T>
) => {
    const existing = context.store.get(typeName as any) as any[]
    const updated = existing.map((o) => (where(o) ? updateMap(o, update) : o))
    // TODO: Add logic for one match, multiple matches etc.
    context.store.update({
        [typeName]: updated
    } as any)
}
