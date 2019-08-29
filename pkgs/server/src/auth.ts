import { verify, JsonWebTokenError } from "jsonwebtoken"
import { AuthChecker } from "type-graphql"
import { Context } from "./context"
import { APP_SECRET } from "./utils"

interface Token {
    userId: string
}

export function getUserId(req: any) {
    const auth = req.headers.authorization
    if (!auth) {
        return ""
    }
    const token = auth.replace("Bearer ", "")
    try {
        const verifiedToken = verify(token, APP_SECRET) as Token
        return verifiedToken.userId
    } catch (e) {
        if (e instanceof JsonWebTokenError) {
            return ""
        }
        throw e
    }
}

export const authChecker: AuthChecker<Context> = async ({
    context: { photon, id }
}) => {
    if (!id) {
        return false
    }
    const user = await photon.users.findOne({ where: { id } })
    if (!user) {
        return false
    }
    return true
}
