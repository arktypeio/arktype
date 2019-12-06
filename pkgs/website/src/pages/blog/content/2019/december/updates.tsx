import { UpdateData } from "../../../common"

export const december2019Updates: UpdateData[] = [
    {
        date: new Date(2019, 11, 1),
        goals: {
            "update context args PR": false,
            "integrate app with new model": false
        }
    },
    {
        date: new Date(2019, 11, 2),
        goals: {
            "update context args PR": false,
            "integrate app with new model": false
        }
    },
    {
        date: new Date(2019, 11, 3),
        goals: {
            "finalize context args PR": true,
            "working server with context args": false
        }
    },
    {
        date: new Date(2019, 11, 4),
        goals: {
            "working server with context args": false
        }
    },
    {
        date: new Date(2019, 11, 5),
        goals: {
            "working server with context args": true,
            "integrate updated server with app": true
        }
    },
    {
        date: new Date(2019, 11, 6),
        goals: {
            "update ShapeQL to work without metadata": false,
            "merge test-execution branch": false
        }
    }
]
