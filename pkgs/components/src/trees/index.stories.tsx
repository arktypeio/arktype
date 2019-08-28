import React from "react"
import { isRecursible, fromEntries } from "redo-utils"
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
    .add("from an object", () => <Tree>{src}</Tree>)
    .add("with hideKeys", () => <Tree hideKeys={["metadata"]}>{src}</Tree>)
    .add("with static extras", () => (
        <Tree
            nodeExtras={
                <IconButton
                    Icon={Icons.add}
                    onClick={() =>
                        console.log(
                            "If a tree falls in the console, and no one is around to hear it..."
                        )
                    }
                />
            }
        >
            {src}
        </Tree>
    ))
    .add("with context-aware extras", () => (
        <Tree
            nodeExtras={(key, value, path) => (
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
            )}
        >
            {src}
        </Tree>
    ))
    .add("with transform", () => (
        <Tree
            transform={node => {
                if (node === "🐛") {
                    return "🦋"
                }
                if (Array.isArray(node)) {
                    return fromEntries(node.map((v, index) => [index + 1, v]))
                }
                return node
            }}
        >
            {src}
        </Tree>
    ))
