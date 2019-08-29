import Photon, { FindOneUserArgs } from "@generated/photon"
import { TagInput } from "@re-do/model"
import { Context } from "../context"

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

type SplitResult<T> = [T[], T[]]

const split = <T>(list: T[], by: (item: T) => boolean) =>
    list.reduce(
        (sorted, item) =>
            (by(item)
                ? [[...sorted[0], item], sorted[1]]
                : [sorted[0], [...sorted[1], item]]) as SplitResult<T>,
        [[], []] as SplitResult<T>
    )

export const createTagConnector = async (
    tags: TagInput[],
    { photon, id }: Context
) => {
    const existing = (await photon.tags.findMany({
        where: { user: { id } }
    })).map(_ => _.name)
    const [used, unused] = split(tags, ({ name }) => name in existing)
    for (const { name } of unused) {
        await photon.tags.create({ data: { name, user: { connect: { id } } } })
    }
    return { connect: tags.map(({ name }) => ({ name })) }
}
