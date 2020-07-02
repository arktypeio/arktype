import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { hash } from "bcrypt"

const prisma = new PrismaClient()

const users = [
    ["David", "Blass"],
    ["Savannah", "Bosse"]
]

async function main() {
    try {
        for (const [first, last] of users) {
            try {
                const user = await prisma.user.create({
                    data: {
                        email: `${first.toLowerCase()}@redo.qa`,
                        first,
                        last,
                        password: await hash("redo", 10)
                    }
                })
                console.log(
                    `🎉\nCreated user: ${JSON.stringify(user, null, 4)}\n🎉`
                )
            } catch (e) {
                console.log(`Failed to create user ${first} ${last}:\n${e}`)
            }
        }
    } catch (e) {
        console.log(e)
    } finally {
        await prisma.disconnect()
    }
}

main()
