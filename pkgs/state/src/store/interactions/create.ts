import { transform } from "@re-do/utils"
import { InteractionContext } from "./common.js"

export const create = (
    typeName: string,
    data: any,
    { db, idKey, model }: InteractionContext
) => {
    const dataToStore = transform(data, ([k, v]) => {
        return [k, v]
    })
    const id = db.create({
        typeName,
        data: dataToStore
    })
    return { ...data, [idKey]: id }
}
