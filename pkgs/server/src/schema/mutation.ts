import { mutationType, inputObjectType, arg } from "nexus"

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
        t.string("email")
        t.string("password")
        t.string("first")
        t.string("last")
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
            resolve: (_, { data: { email, password } }, ctx) => {
                return "faketoken"
            }
        })
    }
})

/*
@Mutation(returns => Session)
    async signIn(
        @Args() { email, password }: SignInInput,
        @Ctx() { photon }: Context
    ) {
        const user = await findUser({
            query: { where: { email: email ? email.toLowerCase() : "" } },
            photon
        })
        if (!user) {
            throw new Error("We don't recognize that email.")
        }
        const passwordValid = await compare(password, user.password)
        if (!passwordValid) {
            throw new Error("That wasn't the right password.")
        }
        return {
            token: sign({ userId: user.id }, APP_SECRET),
            user
        }
    }
*/
