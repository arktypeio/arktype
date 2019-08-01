import React, { useState } from "react"
import { Theme, createStyles } from "@material-ui/core"
import { component } from "blocks"
import {
    PrimaryButton,
    RespondTo,
    SecondaryButton,
    Row,
    Column,
    InfoText,
    TextInput
} from "redo-components"
import { deactivateLearner, resetLearner } from "state"
import { LearnerEvents } from "custom"
import { CircularProgress } from "@material-ui/core"
import gql from "graphql-tag"
import { useMutation } from "@apollo/react-hooks"
import { BrowserEvent } from "redo-model"
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
    query: { learner: { events: null, chromiumInstalling: null } }
})(({ classes, data }) => {
    const [saveTest] = useMutation(SAVETEST)
    const [tags, updateTags] = useState([] as string[])
    const [name, updateName] = useState("")
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
                                    steps: data.learner!.events.map(
                                        ({ __typename, ...inputs }: any) =>
                                            inputs
                                    )
                                }
                            })
                            resetLearner({ updateName, updateTags })
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
                    onChange={e => updateName(e.target.value)}
                />
                <ChipInput
                    value={tags}
                    onAdd={chip => updateTags([...tags, chip])}
                    onDelete={chip => {
                        updateTags(tags.filter(_ => _ !== chip))
                    }}
                />
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
