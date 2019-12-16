import { verify, JsonWebTokenError } from "jsonwebtoken"
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
