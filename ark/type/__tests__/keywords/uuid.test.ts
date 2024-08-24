import { attest, contextualize } from "@ark/attest"
import { ark, type } from "arktype"

const validUuidV4 = "f70b8242-dd57-4e6b-b0b7-649d997140a0"

const validUuidV5 = "f70b8242-dd57-5e6b-b0b7-649d997140a0"

contextualize(() => {
	it("root", () => {
		const uuid = type("string.uuid")
		attest(uuid(validUuidV4)).equals(validUuidV4)
		attest(uuid("1234").toString()).snap('must be a UUID (was "1234")')
	})

	it("version subtype", () => {
		const uuidv4 = type("string.uuid.v4")

		attest(uuidv4(validUuidV4)).equals(validUuidV4)
		attest(uuidv4("1234").toString()).snap('must be a UUIDv4 (was "1234")')

		attest(ark.string.uuid.v5(validUuidV5)).equals(validUuidV5)

		attest(uuidv4(validUuidV5).toString()).equals(
			'must be a UUIDv4 (was "f70b8242-dd57-5e6b-b0b7-649d997140a0")'
		)
	})
})
