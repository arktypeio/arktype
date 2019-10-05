import {
    Query,
    Arg,
    Int,
    Resolver,
    ArgsType,
    Field,
    Authorized,
    Args,
    Mutation,
    FieldResolver,
    Root,
    ObjectType,
    Ctx
} from "type-graphql"
import { Context } from "../context"
import { Class } from "@re-do/utils"

@ArgsType()
export class ById {
    @Field()
    id: string
}

interface ObjectWithId {
    id: string
}

export type ResolverArgs<In, Out extends ObjectWithId, Up> = {
    inType: Class<In>
    outType: Class<Out>
    upType: Class<Up>
}

export const resolver = <In, Out extends ObjectWithId, Up>({
    inType,
    outType,
    upType
}: ResolverArgs<In, Out, Up>) => {
    const name = outType.name.toLowerCase()
    const key = `${name}s`

    @Resolver(of => outType, { isAbstract: true })
    abstract class BaseResolver {
        // TODO: Fix auth
        @Authorized()
        @Query(returns => outType, { name: `${name}` })
        protected async getOne(
            @Args() { id }: ById,
            @Ctx() { photon, userId }: Context
        ) {
            return await (photon as any)[key].findOne({
                where: { id }
            })
        }

        @Authorized()
        @Query(returns => [outType], { name: `${name}s` })
        protected async getAll(@Ctx() { photon, userId: id }: Context) {
            return await (photon as any)[key].findMany({
                where: { user: { id } }
            })
        }

        @Authorized()
        @Mutation(returns => outType, { name: `update${outType.name}` })
        protected async updateOne(
            @Args() { id }: ById,
            @Arg(name, type => upType) data: Up,
            @Ctx() { photon, userId }: Context
        ) {
            return await (photon as any)[key].update({
                data,
                where: { id }
            })
        }
    }

    return BaseResolver
}
