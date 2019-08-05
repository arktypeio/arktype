import React from "react"
import { Theme, createStyles } from "@material-ui/core"
import { component } from "blocks"
import {
    PrimaryButton,
    RespondTo,
    SecondaryButton,
    Row,
    Column,
    Text,
    TextInput
} from "redo-components"
import { deactivateLearner, resetLearner } from "state"
import { LearnerEvents } from "custom"
import { CircularProgress, Typography } from "@material-ui/core"
import gql from "graphql-tag"
import { useMutation } from "@apollo/react-hooks"
import ChipInput from "material-ui-chip-input"
import { store } from "renderer/common"

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
        $steps: [BrowserEventInput!]!
    ) {
        submitTest(name: $name, tags: $tags, steps: $steps)
    }
`

export type LearnerProps = {}

export const Learner = component({
    name: "Learner",
    defaultProps: {} as Partial<LearnerProps>,
    styles,
    query: {
        learner: {
            events: null,
            chromiumInstalling: null,
            name: null,
            tags: null
        }
    }
})(({ data }) => {
    const { events, tags, name, chromiumInstalling } = data.learner!
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
                                    name,
                                    tags,
                                    steps: events.map(
                                        ({ __typename, ...inputs }: any) =>
                                            inputs
                                    )
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
            <Row>
                <TextInput
                    value={name}
                    placeholder="Test name"
                    onChange={e =>
                        store.mutate({ learner: { name: e.target.value } })
                    }
                />
                <ChipInput
                    value={tags}
                    onAdd={(chip: string) =>
                        store.mutate({ learner: { tags: _ => [..._, chip] } })
                    }
                    onDelete={(chip: string) => {
                        store.mutate({
                            learner: {
                                tags: _ => _.filter(current => current !== chip)
                            }
                        })
                    }}
                />
            </Row>

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
        </Column>
    )
})
