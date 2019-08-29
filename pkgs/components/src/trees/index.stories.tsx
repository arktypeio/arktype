import React from "react"
import { fromEntries } from "@re-do/utils"
import { storiesOf } from "@storybook/react"
import { Tree } from "."
import { IconButton } from "../buttons"
import { Icons } from "../icons"
import { Modal } from "../modals"
import { Text } from "../text"

const src = {
    username: "ssalbdivad",
    bug: "🐛",
    metadata: {
        fileCount: 9801,
        isAdmin: true
    },
    docs: {
        work: {
            tpsReports: ["Report1.txt", "Report2.txt", "Report3.txt"],
            notes: {
                meetings: {
                    standup: "standup.md",
                    retro: "retro.md",
                    triage: {
                        january: "🐛",
                        april: "🐛",
                        december: "🐛"
                    },
                    metadata: {
                        ea: "meta",
                        meta: "pod"
                    }
                }
            }
        },
        play: [],
        other: "JacksADullBoy.txt"
    },
    bugs: ["🐛", "🐛", "🐛"],
    music: {
        britney: ["oops.mp3", "iDidIt.mp3", "again.mp3"]
    },
    videos: {
        howRedoGotStarted: "https://www.youtube.com/watch?v=oHg5SJYRHA0"
    }
}

storiesOf("TreeView", module)
    .add("basic", () => <Tree>{src}</Tree>)
    .add("with hidden keys", () => (
        <Tree
            transform={({ key }) =>
                key === "metadata" ? { render: null } : { render: undefined }
            }
        >
            {src}
        </Tree>
    ))
    .add("with context-aware extras", () => (
        <Tree
            transform={({ key, value, path }) => {
                console.log(
                    "If a tree falls in the console, and no one is around to hear it..."
                )
                return {
                    extras: (
                        <Modal>
                            {{
                                toggle: <IconButton Icon={Icons.openModal} />,
                                content: (
                                    <>
                                        <Text>{`This modal was created when you clicked on ${key} at ${path}, which has the following value:`}</Text>
                                        <Text>{JSON.stringify(value)}</Text>
                                    </>
                                )
                            }}
                        </Modal>
                    )
                }
            }}
        >
            {src}
        </Tree>
    ))
    .add("with complex transform", () => (
        <Tree
            transform={({ key, value }) => {
                let updatedValue = value
                if (value === "🐛") {
                    updatedValue = "🦋"
                }
                if (Array.isArray(value)) {
                    updatedValue = fromEntries(
                        value.map((item, index) => [index + 1, item])
                    )
                }
                return { entry: [key, updatedValue] }
            }}
        >
            {src}
        </Tree>
    ))
