import React from "react"
import { Theme, createStyles } from "@material-ui/core"
import { component, PrimaryButton, Response } from "blocks"
import { deactivateLearner } from "state"
import { LearnerEvents } from "custom"

const styles = (theme: Theme) =>
    createStyles({
        events: {
            flexGrow: 1
        }
    })

export type LearnerProps = {}

export const Learner = component({
    name: "Learner",
    defaultProps: {} as Partial<LearnerProps>,
    styles,
    query: { learner: { events: null, chromiumInstalling: null } }
})(({ classes, data }) => (
    <Response
        loadingMessage="Downloading Chrome"
        isLoading={data.learner!.chromiumInstalling}
        contentOnLoading={true}
    >
        <>
            <PrimaryButton
                text="Back home"
                onClick={deactivateLearner}
                color="primary"
            />
            <LearnerEvents events={data.learner!.events.processed} />
        </>
    </Response>
))
