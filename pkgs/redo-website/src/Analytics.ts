import Analytics from "analytics-node"
import { ResponseState } from "redo-components"

const client = new Analytics(
    process.env.NODE_ENV === "production"
        ? "gQscesLul7D1poYWV14gUOtHQOEwgujC"
        : "lcfnD5Bi8kwcsL0S6ctbBUS43J18vLs6"
)

type TrackOptions = {
    email: string
}

const prelaunchRegister = async ({
    email
}: TrackOptions): Promise<ResponseState<any>> => {
    client.track({
        event: "Prelaunch User Registered",
        anonymousId: (localStorage.getItem("ajs_anonymous_id") || "?").replace(
            /"/g,
            ""
        ),
        properties: {
            email
        }
    })
    return {}
}

export const track = {
    prelaunchRegister
}
