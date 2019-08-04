import Photon, { FindOneUserArgs } from "@generated/photon"

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
