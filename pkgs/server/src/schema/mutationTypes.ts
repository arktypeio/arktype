import { compare, hash } from "bcrypt"
import { sign } from "jsonwebtoken"
import { APP_SECRET, ifExists } from "../utils"

import { Resolver, Mutation, Arg } from "type-graphql"

@Resolver()
export class AuthResolver {
    @Mutation()
    async signIn(
        @Arg("email") email: string,
        @Arg("password") password: string
    ) {
        const user = await ifExists(() =>
            prisma.user.findOne({
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

    @Mutation()
    async signUp(
        @Arg("email") email: string,
        @Arg("first") first: string,
        @Arg("last") last: string,
        @Arg("password") password: string
    ) {
        const existingUser = await ifExists(() =>
            prisma.user.findOne({
                where: {
                    email: email ? email.toLowerCase() : ""
                }
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
}
