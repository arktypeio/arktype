import Analytics from "analytics-node"
import { SubmissionState } from "@re-do/components"

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
}: TrackOptions): Promise<SubmissionState<{}>> => {
    client.track({
        event: "Prelaunch User Registered",
        anonymousId: "?",
        properties: {
            email
        }
    })
    return { data: {} }
}

export const track = {
    prelaunchRegister
}
