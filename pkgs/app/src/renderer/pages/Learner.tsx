import React from "react"
import { component } from "blocks"
import {
    Button,
    RespondTo,
    Row,
    Column,
    Text,
    TextInput,
    AppBar,
    AppBarProps,
    usePalette,
    Icons,
    IconButton
} from "@re-do/components"
import { deactivateLearner, resetLearner } from "state"
import { LearnerEvents, RedoAppBar } from "custom"
import { CircularProgress } from "@material-ui/core"
import gql from "graphql-tag"
import { useMutation } from "@apollo/react-hooks"
import ChipInput from "material-ui-chip-input"
import { store } from "../common"

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
    const { primary } = usePalette()
    return (
        <>
            <div style={{ height: 90 }}>
                <AppBar style={{ height: 90 }}>
                    <Column align="center">
                        <TextInput
                            value={name}
                            placeholder="Test Name"
                            colorTemplate="light"
                            kind="underlined"
                            onChange={e =>
                                store.mutate({
                                    learner: { testName: e.target.value }
                                })
                            }
                        />
                        {/* TODO Chip input should be moved to redo components as part of: https://trello.com/c/eVo1vyZj */}
                        <ChipInput
                            value={tags}
                            placeholder="Add Tags"
                            onAdd={(chip: string) =>
                                store.mutate({
                                    learner: { testTags: _ => [..._, chip] }
                                })
                            }
                            onDelete={(chip: string) => {
                                store.mutate({
                                    learner: {
                                        testTags: _ =>
                                            _.filter(
                                                current => current !== chip
                                            )
                                    }
                                })
                            }}
                        />
                    </Column>
                </AppBar>
            </div>
            <div>
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
            </div>
            <div>
                <AppBar
                    style={{
                        bottom: 0,
                        position: "fixed",
                        backgroundColor: primary.main
                    }}
                    justify="space-around"
                >
                    <IconButton
                        Icon={Icons.close}
                        style={{ color: "white" }}
                        onClick={deactivateLearner}
                    />

                    <RespondTo response={{ loading: false }}>
                        <IconButton
                            Icon={Icons.save}
                            style={{ color: "white" }}
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
                        />
                    </RespondTo>
                </AppBar>
            </div>
        </>
    )
})
