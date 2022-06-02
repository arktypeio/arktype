import { InteractionContext } from "./common.js"

export const all = (typeName: string, { db }: InteractionContext) => {
    return db.all({ typeName })
}
