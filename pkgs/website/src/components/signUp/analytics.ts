import { v4 } from "uuid"
import reactGA from "react-ga"

reactGA.initialize("UA-173540201-1", {
    debug: true,
    alwaysSendToDefaultTracker: true
})
reactGA.pageview(window.location.pathname + window.location.search)

type SubscribeOptions = {
    email: string
}

const subscribe = ({ email }: SubscribeOptions) => {
    if (!localStorage.userId) {
        localStorage.userId = v4()
    }
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
