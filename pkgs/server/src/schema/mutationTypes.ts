import { schema } from "nexus"
import { deepMap } from "@re-do/utils"
import { TagCreateInput } from "@prisma/client"
import { compare, hash } from "bcrypt"
import { sign } from "jsonwebtoken"
import { APP_SECRET, ifExists } from "../utils"

const SignInInput = schema.inputObjectType({
    name: "SignInInput",
    nonNullDefaults: { input: true },
    definition: (t) => {
        t.string("email")
        t.string("password")
    },
})

const SignUpInput = schema.inputObjectType({
    name: "SignUpInput",
    nonNullDefaults: { input: true },
    definition: (t) => {
        t.string("email")
        t.string("password")
        t.string("first")
        t.string("last")
    },
})

const createTestPreresolve = async ({ args, ctx: { prisma } }) => {
    const findTags = (args: any): TagCreateInput[] => {
        if (typeof args !== "object") {
            return []
        }
        const nestedTags = Object.values(args).reduce<TagCreateInput[]>(
            (tags, arg) => [...tags, ...findTags(arg)],
            []
        )
        const shallowTags =
            args?.tags?.create?.filter(
                (tag: TagCreateInput) =>
                    !nestedTags.find((nestedTag) => nestedTag.name === tag.name)
            ) ?? []
        return [...nestedTags, ...shallowTags]
    }
    const tags = findTags(args)
    for (const tag of tags) {
        await prisma.tag.upsert({
            update: {},
            where: {
                name_user: {
                    name: tag.name,
                },
            },
            create: tag,
        })
    }
    const mappedResult = deepMap(args!, (entry) =>
        entry[0] === "tags"
            ? [
                  "tags",
                  {
                      connect: entry[1].create.map(
                          ({ name }: TagCreateInput) => ({
                              name_user: {
                                  name,
                              },
                          })
                      ),
                  },
              ]
            : entry
    )
    return mappedResult
}

const Mutation = schema.mutationType({
    definition: (t) => {
        t.crud.createOneTest({
            alias: "createTest",
        })
        t.field("signIn", {
            type: "String",
            args: {
                data: schema.arg({ type: SignInInput, required: true }),
            },
            resolve: async (_, { data: { email, password } }, { prisma }) => {
                const user = await ifExists(() =>
                    prisma.user.findOne({
                        where: { email: email ? email.toLowerCase() : "" },
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
            },
        }),
            t.field("signUp", {
                type: "String",
                args: {
                    data: schema.arg({ type: SignUpInput, required: true }),
                },
                resolve: async (
                    _,
                    { data: { email, password, first, last } },
                    { prisma }
                ) => {
                    const existingUser = await ifExists(() =>
                        prisma.user.findOne({
                            where: { email: email ? email.toLowerCase() : "" },
                        })
                    )
                    if (existingUser) {
                        throw new Error(
                            "Someone's already using that email. If it's you, try signing in instead!"
                        )
                    }
                    const hashedPassword = await hash(password, 10)
                    const user = await prisma.user.create({
                        data: {
                            email,
                            password: hashedPassword,
                            first,
                            last,
                            tags: {
                                create: [],
                            },
                            steps: {
                                create: [],
                            },
                            tests: {
                                create: [],
                            },
                        },
                    })
                    return sign({ userId: user.id }, APP_SECRET)
                },
            })
    },
})

export const mutationTypes = [Mutation]
