import Photon, { FindOneUserArgs } from "@generated/photon"
import { TagInput } from "redo-model";

type FindUserOptions = {
    photon: Photon
    query: FindOneUserArgs
}

// TODO: Find an idiomatic way to check if a unique field exists in photon
export const findUser = async ({ query, photon }: FindUserOptions) => {
    try {
        return await photon.users.findOne(query)
    } catch {
        return null
    }
}

export const createTagsInput = (tags: TagInput[], id: string) =>
            tags.map(({ ...fields }) => ({
                ...fields,
                user: { connect: { id} }
            }))