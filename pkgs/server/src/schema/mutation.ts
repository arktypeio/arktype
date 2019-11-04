import { mutationType, inputObjectType, arg } from "nexus"
import { compare, hash } from "bcrypt"
import { sign } from "jsonwebtoken"
import { APP_SECRET, ifExists } from "../utils"

export const SignInInput = inputObjectType({
    name: "SignInInput",
    definition(t) {
        t.string("email", { required: true })
        t.string("password", { required: true })
    }
})

export const SignUpInput = inputObjectType({
    name: "SignUpInput",
    definition(t) {
        t.string("email", { required: true })
        t.string("password", { required: true })
        t.string("first", { required: true })
        t.string("last", { required: true })
    }
})

export const Mutation = mutationType({
    definition(t) {
        t.crud.createOneTag()
        t.crud.createOneSelector()
        t.crud.createOneUser()
        t.crud.createOneTest()
        t.crud.createOneStep()
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

/*
@Mutation(returns => Session)
    async signUp(
        @Args() { email, password, firstName, lastName }: SignUpInput,
        @Ctx() { photon }: Context
    ) {
        const hashedPassword = await hash(password, 10)
        if (
            await findUser({
                query: { where: { email: email ? email.toLowerCase() : "" } },
                photon
            })
        ) {
            throw new Error(
                "Someone's already using that email. If it's you, try signin instead!"
            )
        }
        const user = await photon.users.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
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
        return {
            token: sign({ userId: user.id }, APP_SECRET),
            user
        }
    }
*/
