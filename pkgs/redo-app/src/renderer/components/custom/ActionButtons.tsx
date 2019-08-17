import React from "react"

import { Button } from "redo-components"

import { TypeAction } from "redo-model"

type ActionToButton = { [_ in NonNullable<TypeAction>]: (JSX.Element) }

export const actionToButton: ActionToButton = {
    CREATE: <Button>Create</Button>,
    DELETE: <Button>Delete</Button>,
    UPDATE: <Button>Update</Button>,
    RUN: <Button>Run</Button>
}

// create higher order functions that take in a metadatakey and output a function which can delete/etc. something of that type.
