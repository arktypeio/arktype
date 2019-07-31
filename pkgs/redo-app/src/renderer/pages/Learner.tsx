import React from "react"
import { Theme, createStyles } from "@material-ui/core"
import { component } from "blocks"
import {
    PrimaryButton,
    RespondTo,
    SecondaryButton,
    Row,
    Column,
    InfoText
} from "redo-components"
import { deactivateLearner, saveLearner } from "state"
import { LearnerEvents } from "custom"
import { CircularProgress } from "@material-ui/core"

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
})(({ classes, data }) => {
    return (
        <Column justify="flex-start">
            <Row align="center" justify="flex-start">
                <SecondaryButton onClick={deactivateLearner} color="secondary">
                    Back home
                </SecondaryButton>

                <RespondTo response={{ loading: false }}>
                    <PrimaryButton onClick={saveLearner} color="primary">
                        Save test
                    </PrimaryButton>
                </RespondTo>
            </Row>
            <RespondTo
                response={{ loading: data.learner!.chromiumInstalling }}
                options={{
                    loading: {
                        displayAs: ({ value }) =>
                            value ? (
                                <>
                                    <CircularProgress />
                                    <InfoText>Downloading Chrome</InfoText>
                                </>
                            ) : null,
                        hideContent: false
                    }
                }}
            >
                <LearnerEvents events={data.learner!.events} />
            </RespondTo>
        </Column>
    )
})
