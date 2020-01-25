import { mutationType, inputObjectType, arg } from "nexus"
import { compare, hash } from "bcrypt"
import { sign } from "jsonwebtoken"
import { APP_SECRET, ifExists } from "../utils"

const SignInInput = inputObjectType({
    name: "SignInInput",
    nonNullDefaults: { input: true },
    definition: t => {
        t.string("email")
        t.string("password")
    }
})

const SignUpInput = inputObjectType({
    name: "SignUpInput",
    nonNullDefaults: { input: true },
    definition: t => {
        t.string("email")
        t.string("password")
        t.string("first")
        t.string("last")
    }
})

const Mutation = mutationType({
    definition: t => {
        t.crud.createOneTest({ alias: "createTest", upfilteredKey: "create" })
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

export const mutationTypes = [Mutation]
