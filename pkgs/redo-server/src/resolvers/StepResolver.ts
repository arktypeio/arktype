import {
    Authorized,
    Ctx,
    Mutation,
    Query,
    Resolver,
    Args,
    Arg
} from "type-graphql"
import { Step, StepInput, StepUpdate } from "redo-model"
import { Context } from "../context"

@Resolver(of => Step)
export class StepResolver {
    @Authorized()
    @Mutation(returns => String)
    async createStep(
        @Args() { key, selector, value }: StepInput,
        @Ctx() { photon, id }: Context
    ) {
        const step = await photon.steps.create({
            data: {
                key,
                selector,
                value,
                user: { connect: { id: id! } }
            }
        })
        return step.id
    }

    @Authorized()
    @Query(returns => [Step])
    async getSteps(@Ctx() { photon, id }: Context) {
        const results = await photon.steps.findMany({
            where: { user: { id: id! } },
            include: { user: true }
        })
        return results
    }

    @Authorized()
    @Mutation(returns => String)
    async updateStep(
        @Args() { key, selector, value }: StepUpdate,
        @Arg("id") stepId: string,
        @Ctx() { photon, id }: Context
    ) {
        const step = await photon.steps.update({
            data: {
                key,
                selector,
                value,
                user: { connect: { id: id! } }
            },
            where: {
                id: stepId
            }
        })
        return step.id
    }
}
