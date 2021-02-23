import React from "react"
import {
    Column,
    TextInput,
    AppBar,
    Icons,
    Button,
    ChipInput
} from "@re-do/components"
import { loadStore } from "@re-do/model"
import { deactivateLearner } from "state"
import { LearnerEvents } from "./StepCards"
import { store } from "renderer/common"
import { join } from "path"

export const Learner = () => {
    const { steps, testName: name, testTags: tags } = store.useQuery({
        learner: {
            steps: true,
            testName: true,
            testTags: true
        }
    }).learner
    const persistedStore = loadStore({ path: join(process.cwd(), "redo.json") })
    return (
        <Column full>
            <AppBar height={120} align="center">
                <Column align="center">
                    <TextInput
                        value={name}
                        placeholder="Test Name"
                        colorTemplate="light"
                        kind="underlined"
                        onChange={(e) =>
                            store.mutate({
                                learner: { testName: e.target.value }
                            })
                        }
                    />
                    <ChipInput
                        label="Tags"
                        // TODO: Add existing tags
                        possibleSuggestions={[]}
                        onChange={(values) =>
                            store.mutate({
                                learner: {
                                    testTags: values
                                }
                            })
                        }
                    />
                </Column>
            </AppBar>
            <LearnerEvents steps={steps as any} />
            <AppBar kind="bottom" justify="space-around">
                <Button
                    Icon={Icons.close}
                    style={{ color: "white" }}
                    onClick={deactivateLearner}
                />
                <Button
                    Icon={Icons.save}
                    style={{ color: "white" }}
                    onClick={() => {
                        persistedStore.createTest({
                            name,
                            tags,
                            steps: steps as any
                        })
                        deactivateLearner()
                    }}
                />
            </AppBar>
        </Column>
    )
}
