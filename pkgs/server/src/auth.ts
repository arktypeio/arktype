import { verify, JsonWebTokenError } from "jsonwebtoken"
import { APP_SECRET } from "./utils"

type Token = {
    userId: number
}

type ContextEvent = {
    headers?: {
        Authorization?: string
        authorization?: string
    }
}

export const getUserId = (event: ContextEvent) => {
    const auth = event.headers?.Authorization || event.headers?.authorization
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
