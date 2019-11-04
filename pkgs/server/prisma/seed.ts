import { Photon } from "@generated/photon"
import { hash } from "bcrypt"
const photon = new Photon()

const users = [["David", "Blass"], ["Savannah", "Bosse"]]

async function main() {
    try {
        for (const [first, last] of users) {
            try {
                const user = await photon.users.create({
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
        await photon.disconnect()
    }
}

main()
