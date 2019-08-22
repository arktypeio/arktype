import React from "react"
import { Theme, createStyles } from "@material-ui/core"
import { component } from "blocks"
import {
    Button,
    RespondTo,
    Row,
    Column,
    Text,
    TextInput
} from "redo-components"
import { deactivateLearner, resetLearner } from "state"
import { LearnerEvents } from "custom"
import { CircularProgress } from "@material-ui/core"
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
        $tags: [TagInput!]!
        $steps: [BrowserEventInput!]!
    ) {
        submitTest(name: $name, tags: $tags, steps: $steps)
    }
`

export type LearnerProps = {}

export const Learner = component({
    name: "Learner",
    defaultProps: {} as Partial<LearnerProps>,
    styles
})(() => {
    const {
        learner: { events, chromiumInstalling, testName: name, testTags: tags }
    } = store.query({
        learner: {
            events: null,
            chromiumInstalling: null,
            testName: null,
            testTags: null
        }
    })
    const [saveTest] = useMutation(SAVETEST)
    return (
        <Column justify="flex-start">
            <Row align="center" justify="flex-start">
                <Button onClick={deactivateLearner} kind="secondary">
                    Back home
                </Button>

                <RespondTo response={{ loading: false }}>
                    <Button
                        kind="primary"
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
            <Row>
                <TextInput
                    value={name}
                    placeholder="Test name"
                    onChange={e =>
                        store.mutate({ learner: { testName: e.target.value } })
                    }
                />
                {/* TODO Chip input should be moved to redo components as part of: https://trello.com/c/eVo1vyZj */}
                <ChipInput
                    value={tags}
                    onAdd={(chip: string) =>
                        store.mutate({
                            learner: { testTags: _ => [..._, chip] }
                        })
                    }
                    onDelete={(chip: string) => {
                        store.mutate({
                            learner: {
                                testTags: _ =>
                                    _.filter(current => current !== chip)
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
