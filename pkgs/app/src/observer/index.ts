import { finder } from "@medv/finder"

enum StepKind {
    Click = "click",
    Set = "set"
}

type StepInput = any

const eventMap = {
    click: StepKind.Click,
    dblclick: StepKind.Click,
    submit: StepKind.Click,
    change: StepKind.Set,
    select: StepKind.Set
} as const

type EventMap = typeof eventMap

type EventName = keyof EventMap

const watchPage = async () => {
    const browserWindow: Window & {
        notify: (e: StepInput) => void
    } = window as any
    const handler = async (e: Event) => {
        browserWindow.notify(eventToSteps(e))
    }
    Object.keys(eventMap).forEach((event) =>
        browserWindow.addEventListener(event, handler, true)
    )
}

const eventToSteps = (e: Event) => {
    const kind = eventMap[e.type as EventName]
    const step: any = { kind }
    if (e.target) {
        const target = e.target as HTMLElement
        step.selector = finder(target as HTMLElement)
        if (kind === StepKind.Set) {
            step.value = (target as HTMLInputElement).value
        }
    }
    return step
}

watchPage()
