import { verify, JsonWebTokenError } from "jsonwebtoken"
import { AuthChecker } from "type-graphql"
import { Context } from "./context"
import { APP_SECRET } from "./utils"

interface Token {
    userId: number
}

export const getUserId = (req: any) => {
    const auth = req.headers.authorization
    if (!auth) {
        return 0
    }
    const token = auth.replace("Bearer ", "")
    try {
        const verifiedToken = verify(token, APP_SECRET) as Token
        return verifiedToken.userId
    } catch (e) {
        if (e instanceof JsonWebTokenError) {
            return 0
        }
        throw e
    }
}

export const authChecker: AuthChecker<Context> = async ({
    context: { photon, userId }
}) => {
    if (!userId) {
        return false
    }
    const user = await photon.users.findOne({ where: { id: userId } })
    if (!user) {
        return false
    }
    return true
}
