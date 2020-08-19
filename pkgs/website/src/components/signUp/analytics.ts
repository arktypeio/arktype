import Analytics from "analytics-node"
import { v4 } from "uuid"
import reactGA from "react-ga"

reactGA.initialize("UA-173540201-1", {
    debug: true,
    alwaysSendToDefaultTracker: true
})
reactGA.pageview(window.location.pathname + window.location.search)

const client = new Analytics(
    process.env.NODE_ENV === "production"
        ? "gQscesLul7D1poYWV14gUOtHQOEwgujC"
        : "lcfnD5Bi8kwcsL0S6ctbBUS43J18vLs6"
)

type SubscribeOptions = {
    email: string
}

const subscribe = ({ email }: SubscribeOptions) => {
    if (!localStorage.userId) {
        localStorage.userId = v4()
    }
    client.identify({
        anonymousId: localStorage.userId,
        traits: {
            email
        }
    })
    reactGA.set({ userId: localStorage.userId, email })
    reactGA.event({ category: "User", action: "Signed Up" })
}

export const getAnonymousUserId = () => {
    if (!localStorage.anonymousUserId) {
        localStorage.anonymousUserId = v4()
    }
    return localStorage.anonymousUserId
}

export const track = {
    subscribe
}
