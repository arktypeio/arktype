import React from "react"
import { component } from "blocks"
import {
    Button,
    RespondTo,
    Row,
    Column,
    Text,
    TextInput
} from "@re-do/components"
import { deactivateLearner, resetLearner } from "state"
import { LearnerEvents, RedoAppBar } from "custom"
import { CircularProgress } from "@material-ui/core"
import gql from "graphql-tag"
import { useMutation } from "@apollo/react-hooks"
import { store } from "../common"
import ChipInput from "@re-do/components"

const SAVETEST = gql`
    mutation createTest(
        $name: String!
        $tags: [TagInput!]!
        $steps: [StepInput!]!
    ) {
        createTest(name: $name, tags: $tags, steps: $steps)
    }
`

export type LearnerProps = {}

export const Learner = component({
    name: "Learner",
    defaultProps: {} as Partial<LearnerProps>,
    query: {
        learner: {
            events: null,
            chromiumInstalling: null,
            testName: null,
            testTags: null
        }
    }
})(({ data }) => {
    const {
        events,
        chromiumInstalling,
        testName: name,
        testTags: tags
    } = data.learner!
    const [saveTest] = useMutation(SAVETEST)
    return (
        <Column justify="flex-start">
            <div style={{ zIndex: 1, position: "fixed" }}>
                <RedoAppBar>{["close"]}</RedoAppBar>
                <Row>
                    <TextInput
                        value={name}
                        placeholder="Test Name"
                        onChange={e =>
                            store.mutate({
                                learner: { testName: e.target.value }
                            })
                        }
                    />
                </Row>
            </div>

            <RespondTo
                response={{ loading: chromiumInstalling }}
                options={{
                    loading: {
                        displayAs: ({ value }) =>
                            value ? (
                                <>
                                    <CircularProgress />
                                    <Text align="center">
                                        Downloading Chrome
                                    </Text>
                                </>
                            ) : null,
                        hideContent: false
                    }
                }}
            >
                <LearnerEvents events={events} />
            </RespondTo>
            <Row>
                <RespondTo response={{ loading: false }}>
                    <Button
                        kind="primary"
                        style={{ bottom: 0, position: "fixed", zIndex: 1 }}
                        onClick={async () => {
                            await saveTest({
                                variables: {
                                    name,
                                    tags: tags.map(_ => ({ name: _ })),
                                    steps: events.map(
                                        ({ __typename, ...inputs }: any) =>
                                            inputs
                                    )
                                }
                            })
                            resetLearner()
                        }}
                    >
                        Save test
                    </Button>
                </RespondTo>
            </Row>
        </Column>
    )
})
