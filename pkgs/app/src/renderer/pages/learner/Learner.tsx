import React from "react"
import {
    Column,
    Text,
    Spinner,
    TextInput,
    AppBar,
    Icons,
    IconButton,
    ChipInput,
    ErrorText
} from "@re-do/components"
import { useCreateOneTestMutation } from "@re-do/model/dist/react"
import { deactivateLearner, resetLearner } from "state"
import { LearnerEvents } from "./StepCards"
import { store } from "renderer/common"

export const Learner = () => {
    const result = store.useQuery({
        learner: {
            events: true,
            chromiumInstalling: true,
            testName: true,
            testTags: true
        }
    })
    const {
        events,
        chromiumInstalling,
        testName: name,
        testTags: tags
    } = result.learner
    const [createTest, createTestResult] = useCreateOneTestMutation()
    return (
        <Column full>
            <AppBar height={120} align="center">
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
                    <ChipInput
                        value={tags.map(tag => tag.name)}
                        colorTemplate="light"
                        placeholder="Add Tags"
                        onAdd={(chip: string) =>
                            store.mutate({
                                learner: {
                                    testTags: _ => [..._, { name: chip }]
                                }
                            })
                        }
                        onDelete={(chip: string) => {
                            store.mutate({
                                learner: {
                                    testTags: _ =>
                                        _.filter(
                                            current => current.name !== chip
                                        )
                                }
                            })
                        }}
                    />
                </Column>
            </AppBar>
            <div>
                {chromiumInstalling ? (
                    <Column align="center">
                        <Spinner />
                        <Text>Getting things ready...</Text>
                    </Column>
                ) : (
                    <LearnerEvents steps={events} />
                )}
            </div>
            <AppBar kind="bottom" justify="space-around">
                <IconButton
                    Icon={Icons.close}
                    style={{ color: "white" }}
                    onClick={deactivateLearner}
                />
                {createTestResult.loading ? (
                    <Spinner />
                ) : (
                    <>
                        <IconButton
                            Icon={Icons.save}
                            style={{ color: "white" }}
                            onClick={async () => {
                                await createTest({
                                    variables: {
                                        name,
                                        tags,
                                        steps: events
                                    }
                                })
                                await resetLearner()
                                await deactivateLearner()
                            }}
                        />
                        {createTestResult.error ? (
                            <ErrorText>
                                {createTestResult.error.message}
                            </ErrorText>
                        ) : null}
                    </>
                )}
            </AppBar>
        </Column>
    )
}
