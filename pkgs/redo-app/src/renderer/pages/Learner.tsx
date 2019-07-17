import React from "react"
import { Theme, createStyles } from "@material-ui/core"
import {
    component,
    PrimaryButton,
    Response,
    SecondaryButton,
    Row,
    Column
} from "blocks"
import { deactivateLearner, saveLearner } from "state"
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
    <Column justify="flex-start">
        <Row align="center" justify="flex-start">
            <SecondaryButton
                text="Back home"
                onClick={deactivateLearner}
                color="secondary"
            />

            <Response isLoading={false}>
                <PrimaryButton
                    text="Save test"
                    onClick={saveLearner}
                    color="primary"
                />
            </Response>
        </Row>
        <Response
            loadingMessage="Downloading Chrome"
            isLoading={data.learner!.chromiumInstalling}
            contentOnLoading={true}
        >
            <LearnerEvents events={data.learner!.events} />
        </Response>
    </Column>
))
