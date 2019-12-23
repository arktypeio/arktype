import Analytics from "analytics-node"
import { v4 } from "uuid"

const client = new Analytics(
    process.env.NODE_ENV === "production"
        ? "gQscesLul7D1poYWV14gUOtHQOEwgujC"
        : "lcfnD5Bi8kwcsL0S6ctbBUS43J18vLs6"
)

type TrackOptions = {
    email: string
}

const prelaunchRegister = ({ email }: TrackOptions) => {
    client.identify({
        anonymousId: getAnonymousUserId(),
        traits: {
            email
        }
    })
}

export const getAnonymousUserId = () => {
    if (!localStorage.anonymousUserId) {
        localStorage.anonymousUserId = v4()
    }
    return localStorage.anonymousUserId
}

export const track = {
    prelaunchRegister
}
