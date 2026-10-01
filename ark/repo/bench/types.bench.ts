import { bench } from "@ark/attest"
import { scope, type } from "arktype"
import * as v from "valibot"
import { z } from "zod"

// every bench assigns its inferred output here, so each library resolves the
// whole type rather than deferring it
type Derived = {
	id: string
	authenticatorAttachment?: "cross-platform" | "platform" | undefined
}

bench.baseline(() => {
	type({ foo: "string" }).or({ bar: "number" }).array()
	z.array(
		z.union([z.object({ foo: z.string() }), z.object({ bar: z.number() })])
	)
	v.array(
		v.union([v.object({ foo: v.string() }), v.object({ bar: v.number() })])
	)
})

bench("arktype", () => {
	const authenticatorTransportFutureSchema = type
		.enumerated("ble", "internal", "nfc", "usb", "cable", "hybrid")
		.array()

	const authenticatorAttachmentSchema = type.enumerated(
		"cross-platform",
		"platform"
	)

	const AuthenticationResponseJSONSchema = type({
		id: "string",
		rawId: "string",
		response: {
			clientDataJSON: "string",
			authenticatorData: "string",
			signature: "string",
			"userHandle?": "string"
		},
		"authenticatorAttachment?": authenticatorAttachmentSchema,
		clientExtensionResults: {
			"appid?": "boolean",
			"credProps?": {
				"rk?": "boolean"
			},
			"hmacCreateSecret?": "boolean"
		},
		type: "'public-key'"
	})

	const VerifyRegistrationResponseOptsSchema = type({
		id: "string",
		rawId: "string",
		response: {
			clientDataJSON: "string",
			attestationObject: "string",
			"transports?": authenticatorTransportFutureSchema
		},
		"authenticatorAttachment?": authenticatorAttachmentSchema,
		clientExtensionResults: {
			"appid?": "boolean",
			"credProps?": {
				"rk?": "boolean"
			},
			"hmacCreateSecret?": "boolean"
		},
		type: "'public-key'"
	})

	const derived = VerifyRegistrationResponseOptsSchema.pick(
		"id",
		"clientExtensionResults",
		"authenticatorAttachment"
	).omit("clientExtensionResults")
	const out: Derived = {} as typeof derived.infer
}).types([7390, "instantiations"])

bench("arktype scope", () => {
	const types = scope({
		authenticatorTransportFutureSchema:
			"('ble'|'internal'|'nfc'|'usb'|'cable'|'hybrid')[]",
		authenticatorAttachmentSchema: "'cross-platform'|'platform'",
		authenticationResponseJSONSchema: {
			id: "string",
			rawId: "string",
			response: {
				clientDataJSON: "string",
				authenticatorData: "string",
				signature: "string",
				"userHandle?": "string"
			},
			"authenticatorAttachment?": "authenticatorAttachmentSchema",
			clientExtensionResults: {
				"appid?": "boolean",
				"credProps?": {
					"rk?": "boolean"
				},
				"hmacCreateSecret?": "boolean"
			},
			type: "'public-key'"
		},
		verifyRegistrationResponseOptsSchema: {
			id: "string",
			rawId: "string",
			response: {
				clientDataJSON: "string",
				attestationObject: "string",
				"transports?": "authenticatorTransportFutureSchema"
			},
			"authenticatorAttachment?": "authenticatorAttachmentSchema",
			clientExtensionResults: {
				"appid?": "boolean",
				"credProps?": {
					"rk?": "boolean"
				},
				"hmacCreateSecret?": "boolean"
			},
			type: "'public-key'"
		}
	}).export()

	const derived = types.verifyRegistrationResponseOptsSchema
		.pick("id", "clientExtensionResults", "authenticatorAttachment")
		.omit("clientExtensionResults")
	const out: Derived = {} as typeof derived.infer
}).types([12727, "instantiations"])

bench("zod", () => {
	const authenticatorTransportFutureSchema = z.array(
		z.union([
			z.literal("ble"),
			z.literal("internal"),
			z.literal("nfc"),
			z.literal("usb"),
			z.literal("cable"),
			z.literal("hybrid")
		])
	)
	const authenticatorAttachmentSchema = z.union([
		z.literal("cross-platform"),
		z.literal("platform")
	])
	const authenticationResponseJSONSchema = z.object({
		id: z.string(),
		rawId: z.string(),
		response: z.object({
			clientDataJSON: z.string(),
			authenticatorData: z.string(),
			signature: z.string(),
			userHandle: z.string().optional()
		}),
		authenticatorAttachment: authenticatorAttachmentSchema.optional(),
		clientExtensionResults: z.object({
			appid: z.boolean().optional(),
			credProps: z
				.object({
					rk: z.boolean().optional()
				})
				.optional(),
			hmacCreateSecret: z.boolean().optional()
		}),
		type: z.literal("public-key")
	})

	const verifyRegistrationResponseOptsSchema = z.object({
		id: z.string(),
		rawId: z.string(),
		response: z.object({
			clientDataJSON: z.string(),
			attestationObject: z.string(),
			transports: authenticatorTransportFutureSchema.optional()
		}),
		authenticatorAttachment: authenticatorAttachmentSchema.optional(),
		clientExtensionResults: z.object({
			appid: z.boolean().optional(),
			credProps: z
				.object({
					rk: z.boolean().optional()
				})
				.optional(),
			hmacCreateSecret: z.boolean().optional()
		}),
		type: z.literal("public-key")
	})

	const derived = verifyRegistrationResponseOptsSchema
		.pick({
			id: true,
			clientExtensionResults: true,
			authenticatorAttachment: true
		})
		.omit({ clientExtensionResults: true })
	const out: Derived = {} as z.output<typeof derived>
}).types([1265, "instantiations"])

bench("valibot", () => {
	const authenticatorTransportFutureSchema = v.array(
		v.picklist(["ble", "internal", "nfc", "usb", "cable", "hybrid"])
	)
	const authenticatorAttachmentSchema = v.picklist([
		"cross-platform",
		"platform"
	])
	const authenticationResponseJSONSchema = v.object({
		id: v.string(),
		rawId: v.string(),
		response: v.object({
			clientDataJSON: v.string(),
			authenticatorData: v.string(),
			signature: v.string(),
			userHandle: v.optional(v.string())
		}),
		authenticatorAttachment: v.optional(authenticatorAttachmentSchema),
		clientExtensionResults: v.object({
			appid: v.optional(v.boolean()),
			credProps: v.optional(v.object({ rk: v.optional(v.boolean()) })),
			hmacCreateSecret: v.optional(v.boolean())
		}),
		type: v.literal("public-key")
	})

	const verifyRegistrationResponseOptsSchema = v.object({
		id: v.string(),
		rawId: v.string(),
		response: v.object({
			clientDataJSON: v.string(),
			attestationObject: v.string(),
			transports: v.optional(authenticatorTransportFutureSchema)
		}),
		authenticatorAttachment: v.optional(authenticatorAttachmentSchema),
		clientExtensionResults: v.object({
			appid: v.optional(v.boolean()),
			credProps: v.optional(v.object({ rk: v.optional(v.boolean()) })),
			hmacCreateSecret: v.optional(v.boolean())
		}),
		type: v.literal("public-key")
	})

	const derived = v.omit(
		v.pick(verifyRegistrationResponseOptsSchema, [
			"id",
			"clientExtensionResults",
			"authenticatorAttachment"
		]),
		["clientExtensionResults"]
	)
	const out: Derived = {} as v.InferOutput<typeof derived>
}).types([35894, "instantiations"])
