import {
    Authorized,
    Ctx,
    Mutation,
    Query,
    Resolver,
    Args,
    Arg
} from "type-graphql"
import { Step, StepInput, StepUpdate } from "@re-do/model"
import { Context } from "../context"

@Resolver(of => Step)
export class StepResolver {
    @Authorized()
    @Mutation(returns => Step)
    async createStep(
        @Args() { action, selector, value }: StepInput,
        @Ctx() { photon, userId: id }: Context
    ) {
        const step = await photon.steps.create({
            data: {
                action,
                selector: {
                    create: {
                        css: selector.css,
                        user: { connect: { id } }
                    }
                },
                value,
                user: { connect: { id } }
            },
            include: {
                user: true,
                selector: true
            }
        })
        return step
    }

    @Authorized()
    @Query(returns => [Step])
    async getSteps(@Ctx() { photon, userId: id }: Context) {
        const steps = await photon.steps.findMany({
            where: { user: { id } },
            include: { user: true, selector: true }
        })
        return steps
    }

    @Authorized()
    @Mutation(returns => Step)
    async updateStep(
        @Args() { action, selector, value }: StepUpdate,
        @Arg("id") stepId: string,
        @Ctx() { photon, userId: id }: Context
    ) {
        const step = await photon.steps.update({
            data: {
                action,
                selector: selector
                    ? {
                          create: {
                              css: selector.css,
                              user: { connect: { id } }
                          }
                      }
                    : undefined,
                value,
                user: { connect: { id } }
            },
            where: {
                id: stepId
            },
            include: {
                user: true,
                selector: true
            }
        })
        return step
    }
}
