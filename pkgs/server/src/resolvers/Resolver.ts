import {
    Query,
    Arg,
    Int,
    Resolver,
    ArgsType,
    Field,
    Args,
    FieldResolver,
    Root,
    Ctx
} from "type-graphql"
import { Context } from "../context"
import { Class } from "@re-do/utils"

@ArgsType()
export class GetAllArgs {
    @Field(type => Int)
    skip: number = 0

    @Field(type => Int)
    take: number = 10
}

interface Entity {
    id: string
}

export function ResolverOf<T extends Entity>(cls: Class<T>) {
    const name = cls.name.toLocaleLowerCase()

    // `isAbstract` decorator option is mandatory to prevent multiple registering in schema
    @Resolver(of => cls, { isAbstract: true })
    abstract class BaseResolver {
        @Query(returns => [cls], { name: `${name}s` })
        protected async getAll(@Ctx() { photon, id }: Context) {
            return await (photon as any)[name].findMany({
                where: { user: { id } }
            })
        }
    }

    return BaseResolver
}
