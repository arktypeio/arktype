import { type } from "arktype"
import { EventEmitter } from "node:events"
import { Readable } from "node:stream"

export const Emitting = type({ emitter: type.instanceOf(EventEmitter) })

export const Streaming = type({ stream: type.instanceOf(Readable) })

export const Buffered = type({ buffer: type.instanceOf(Buffer) })
