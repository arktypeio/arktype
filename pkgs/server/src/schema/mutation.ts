import { mutationType, inputObjectType, arg } from "nexus"
import { compare, hash } from "bcrypt"
import { sign } from "jsonwebtoken"
import { APP_SECRET, ifExists } from "../utils"

const SignInInput = inputObjectType({
    name: "SignInInput",
    definition(t) {
        t.string("email", { required: true })
        t.string("password", { required: true })
    }
})

const SignUpInput = inputObjectType({
    name: "SignUpInput",
    definition(t) {
        t.string("email", { required: true })
        t.string("password", { required: true })
        t.string("first", { required: true })
        t.string("last", { required: true })
    }
})

const CreateSelectorInput = inputObjectType({
    name: "CreateSelectorInput",
    definition(t) {
        t.string("css", { required: true })
    }
})

const CreateTagInput = inputObjectType({
    name: "CreateTagInput",
    definition(t) {
        t.string("name", { required: true })
    }
})

const CreateStepInput = inputObjectType({
    name: "CreateStepInput",
    definition(t) {
        t.string("action", { required: true })
        t.field("selector", { type: "CreateSelectorInput", required: true })
        t.string("value", { required: true })
    }
})

const CreateTestInput = inputObjectType({
    name: "CreateTestInput",
    definition(t) {
        t.string("name", { required: true })
        t.field("tags", { type: "CreateTagInput", list: true })
        t.field("steps", {
            type: "CreateStepInput",
            required: true,
            list: true
        })
    }
})

const Mutation = mutationType({
    definition(t) {
        t.crud.createOneSelector()
        t.field("createTest", {
            type: "Test",
            args: {
                data: arg({ type: CreateTestInput, required: true })
            },
            resolve: async (
                _,
                { data: { name, steps, tags } },
                { photon, userId }
            ) => {
                if (!userId) {
                    throw new Error("You need to be logged in to do that!")
                }
                const stepIds: number[] = []
                for (const step of steps) {
                    const result = await photon.steps.create({
                        data: {
                            action: step.action,
                            value: step.value,
                            selector: {
                                create: {
                                    css: step.selector.css
                                }
                            }
                        }
                    })
                    stepIds.push(result.id)
                }

                const test = await photon.tests.create({
                    data: {
                        name,
                        steps: {
                            connect: stepIds.map(id => ({ id }))
                        },
                        user: {
                            connect: {
                                id: userId
                            }
                        },
                        tags: tags
                            ? {
                                  create: tags.map(tag => ({
                                      user: { connect: { id: userId } },
                                      ...tag
                                  }))
                              }
                            : undefined
                    }
                })
                return test
            }
        })
        t.field("signIn", {
            type: "String",
            args: {
                data: arg({ type: SignInInput, required: true })
            },
            resolve: async (_, { data: { email, password } }, { photon }) => {
                const user = await ifExists(() =>
                    photon.users.findOne({
                        where: { email: email ? email.toLowerCase() : "" }
                    })
                )
                if (!user) {
                    throw new Error("We don't recognize that email.")
                }
                const passwordValid = await compare(password, user.password)
                if (!passwordValid) {
                    throw new Error("That wasn't the right password.")
                }
                return sign({ userId: user.id }, APP_SECRET)
            }
        }),
            t.field("signUp", {
                type: "String",
                args: {
                    data: arg({ type: SignUpInput, required: true })
                },
                resolve: async (
                    _,
                    { data: { email, password, first, last } },
                    { photon }
                ) => {
                    const existingUser = await ifExists(() =>
                        photon.users.findOne({
                            where: { email: email ? email.toLowerCase() : "" }
                        })
                    )
                    if (existingUser) {
                        throw new Error(
                            "Someone's already using that email. If it's you, try signing in instead!"
                        )
                    }
                    const hashedPassword = await hash(password, 10)
                    const user = await photon.users.create({
                        data: {
                            email,
                            password: hashedPassword,
                            first,
                            last,
                            tags: {
                                create: []
                            },
                            steps: {
                                create: []
                            },
                            tests: {
                                create: []
                            }
                        }
                    })
                    return sign({ userId: user.id }, APP_SECRET)
                }
            })
    }
})

export const mutationTypes = [
    CreateSelectorInput,
    CreateStepInput,
    CreateTagInput,
    CreateTestInput,
    Mutation
]
