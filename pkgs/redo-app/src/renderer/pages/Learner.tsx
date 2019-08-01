import React from "react"
import { Theme, createStyles } from "@material-ui/core"
import { component } from "blocks"
import {
    Column,
    InfoText,
    PrimaryButton,
    RespondTo,
    SecondaryButton,
    Row
} from "redo-components"
import { deactivateLearner, resetLearner } from "state"
import { LearnerEvents } from "custom"
import { CircularProgress } from "@material-ui/core"
import { useMutation } from "@apollo/react-hooks"
import gql from "graphql-tag"

const styles = (theme: Theme) =>
    createStyles({
        events: {
            flexGrow: 1
        }
    })

const SAVETEST = gql`
    mutation submitTest(
        $name: String!
        $tags: [String!]!
        $steps: [BrowserEvent!]!
    ) {
        submitTest(name: $name, tags: $tags, steps: $steps)
    }
`

export type LearnerProps = {}

export const Learner = component({
    name: "Learner",
    defaultProps: {} as Partial<LearnerProps>,
    styles,
    query: { learner: { events: null, chromiumInstalling: null } }
})(({ classes, data }) => {
    const [saveTest] = useMutation(SAVETEST)
    return (
        <Column justify="flex-start">
            <Row align="center" justify="flex-start">
                <SecondaryButton onClick={deactivateLearner} color="secondary">
                    Back home
                </SecondaryButton>

                <RespondTo response={{ loading: false }}>
                    <PrimaryButton
                        onClick={async () => {
                            await saveTest({
                                variables: {
                                    name: "placeholder",
                                    tags: ["tag1", "tag3"],
                                    steps: data.learner!.events
                                }
                            })
                            resetLearner()
                        }}
                        color="primary"
                    >
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
