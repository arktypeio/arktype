import { attest, contextualize } from "@ark/attest"
import { scope, type, type Locale } from "arktype"
import { keywordPhrases } from "arktype/internal/keywords/phrases.ts"
import { de } from "arktype/locales/de"
import { en } from "arktype/locales/en"
import { matrixOf } from "./matrix.ts"
import { withConfig } from "./withConfig.ts"

// lib targets ES2020, before ListFormat
const { ListFormat } = Intl as {} as {
	ListFormat: new (
		tag: string,
		options: { type: "conjunction" | "disjunction" }
	) => { format: (items: readonly string[]) => string }
}

contextualize(() => {
	it("is complete", () => {
		attest(Object.keys(de.keywordPhrases)).equals(
			Object.keys(en.keywordPhrases)
		)
		attest(Object.keys(de.nouns).sort()).equals(Object.keys(en.nouns).sort())
		attest(
			(): Locale.Complete => ({
				...de,
				// @ts-expect-error
				keywordPhrases: {}
			})
		).type.errors("is missing")
	})

	it("renders every code and variant", () => {
		attest(matrixOf(de)).snap({
			'string > 0 ← ""': "darf nicht leer sein",
			'string <= 0 ← "x"': "muss leer sein, ist aber 1 Zeichen lang",
			'string == 0 ← "x"': "muss leer sein, ist aber 1 Zeichen lang",
			"unknown[] <= 0 ← [0]": "muss leer sein, enthält aber 1 Element",
			"unknown[] == 0 ← [0]": "muss leer sein, enthält aber 1 Element",
			"number >= 0 ← -1": "darf nicht negativ sein, ist aber -1",
			"number > 0 ← 0": "muss positiv sein, ist aber 0",
			"number <= 0 ← 1": "darf nicht positiv sein, ist aber 1",
			"number < 0 ← 0": "muss negativ sein, ist aber 0",
			'string >= 1 ← ""': "darf nicht leer sein",
			"unknown[] >= 1 ← []": "darf nicht leer sein",
			"number % 1 ← 2.5": "muss eine ganze Zahl sein, ist aber 2,5",
			'string > 1 ← "x"':
				"muss mindestens 2 Zeichen lang sein, ist aber 1 Zeichen lang",
			'string <= 1 ← "xx"':
				"muss höchstens 1 Zeichen lang sein, ist aber 2 Zeichen lang",
			'string == 1 ← "xx"':
				"muss genau 1 Zeichen lang sein, ist aber 2 Zeichen lang",
			"unknown[] <= 1 ← [0,1]":
				"muss höchstens 1 Element enthalten, enthält aber 2 Elemente",
			"unknown[] == 1 ← [0,1]":
				"muss genau 1 Element enthalten, enthält aber 2 Elemente",
			"number >= 1 ← 0": "muss mindestens 1 sein, ist aber 0",
			"number > 1 ← 1": "muss größer als 1 sein, ist aber 1",
			"number <= 1 ← 2": "muss höchstens 1 sein, ist aber 2",
			"number < 1 ← 1": "muss kleiner als 1 sein, ist aber 1",
			'string >= 2 ← "x"':
				"muss mindestens 2 Zeichen lang sein, ist aber 1 Zeichen lang",
			"unknown[] >= 2 ← [0]":
				"muss mindestens 2 Elemente enthalten, enthält aber 1 Element",
			"number % 2 ← 3.5": "muss gerade sein, ist aber 3,5",
			'string > 2 ← "xx"':
				"muss mindestens 3 Zeichen lang sein, ist aber 2 Zeichen lang",
			'string <= 2 ← "xxx"':
				"muss höchstens 2 Zeichen lang sein, ist aber 3 Zeichen lang",
			'string == 2 ← "xxx"':
				"muss genau 2 Zeichen lang sein, ist aber 3 Zeichen lang",
			"unknown[] <= 2 ← [0,1,2]":
				"muss höchstens 2 Elemente enthalten, enthält aber 3 Elemente",
			"unknown[] == 2 ← [0,1,2]":
				"muss genau 2 Elemente enthalten, enthält aber 3 Elemente",
			"number % 5 ← 6.5": "muss ein Vielfaches von 5 sein, ist aber 6,5",
			"number >= 1.5 ← 1.25": "muss mindestens 1,5 sein, ist aber 1,25",
			"number < -1.5 ← -1.5": "muss kleiner als -1,5 sein, ist aber -1,5",
			"number != 0 ← 0": "muss ungleich 0 sein, ist aber 0",
			"number != 1.5 ← 1.5": "muss ungleich 1,5 sein, ist aber 1,5",
			'string != 2 ← "xx"':
				"darf nicht 2 Zeichen lang sein, ist aber 2 Zeichen lang",
			"unknown[] != 2 ← [0,1]":
				"darf nicht 2 Elemente enthalten, ist aber ein Array mit 2 Elementen",
			"unknown[] == 1 ← []": "muss genau 1 Element enthalten, ist aber leer",
			"unknown[] >= 2 ← []": "muss mindestens 2 Elemente enthalten",
			"Date < 2000 ← 2001-01-01T00:00:00.000Z":
				"muss spätestens der 31. Dezember 1999, 23:59:59,999 UTC sein, ist aber der 1. Januar 2001",
			"Date <= 2000 ← 2001-05-03T00:00:00.000Z":
				"muss spätestens der 1. Januar 2000 sein, ist aber der 3. Mai 2001",
			"Date >= May 3 ← 2000-05-02T23:00:00.000Z":
				"muss frühestens der 3. Mai 2000 sein, ist aber der 2. Mai 2000, 23:00 UTC",
			"Date > May 3, 12:30 ← 1999-01-01T00:00:00.000Z":
				"muss frühestens der 3. Mai 2000, 12:30:00,001 UTC sein, ist aber der 1. Januar 1999",
			"Date <= May 3, 12:30:05.123 ← 2000-12-31T09:05:00.000Z":
				"muss spätestens der 3. Mai 2000, 12:30:05,123 UTC sein, ist aber der 31. Dezember 2000, 09:05 UTC",
			"Date != May 3 ← 2000-05-03T00:00:00.000Z":
				"muss ungleich dem 3. Mai 2000 sein, ist aber der 3. Mai 2000",
			"May 3 ← 2000-05-04T00:00:00.000Z":
				"muss ein Wert gemäß der Beschreibung „2000-05-03“ sein, ist aber der 4. Mai 2000",
			"enumerated Dates ← 2000-05-05T00:00:00.000Z":
				"muss der 3. Mai 2000 oder der 4. Mai 2000 sein, ist aber der 5. Mai 2000",
			"narrowed Date ← 2000-05-03T00:00:00.000Z":
				"muss gemäß einem anonymen Prädikat gültig sein, ist aber ein Objekt",
			"string ← 5": "muss eine Zeichenkette sein, ist aber eine Zahl",
			'number ← "x"': "muss eine Zahl sein, ist aber eine Zeichenkette",
			"number ← NaN": "muss eine Zahl sein, ist aber NaN",
			"number ← Infinity": "muss eine Zahl sein, ist aber Infinity",
			"bigint ← 1": "muss ein BigInt sein, ist aber eine Zahl",
			"symbol ← 1": "muss ein Symbol sein, ist aber eine Zahl",
			"object ← 1": "muss ein Objekt sein, ist aber eine Zahl",
			"boolean ← 1": "muss ein Wahrheitswert sein, ist aber 1",
			"null ← 1": "muss null sein, ist aber 1",
			"undefined ← null": "muss undefined sein, ist aber null",
			"'a' ← \"b\"": 'muss "a" sein, ist aber "b"',
			"5 ← 4": "muss 5 sein, ist aber 4",
			"1.5 ← 2.5": "muss 1,5 sein, ist aber 2,5",
			"5n ← 4n": "muss 5n sein, ist aber 4n",
			"true ← false": "muss true sein, ist aber false",
			"unit object ← {}": "muss {} sein, ist aber ein Objekt",
			"unit symbol ← 1": "muss Symbol(s) sein, ist aber 1",
			"Date ← 1": "muss ein Date-Objekt sein, ist aber eine Zahl",
			"Date ← Invalid Date":
				"muss ein Date-Objekt sein, ist aber ein ungültiges Date-Objekt",
			"Date ← Object.create(Date.prototype)":
				"muss ein Date-Objekt sein, ist aber ein Objekt",
			"Array ← {}": "muss ein Array sein, ist aber ein Objekt",
			"Map ← []": "muss eine Map sein, ist aber ein Array",
			"Set ← Map": "muss ein Set sein, ist aber eine Map",
			'RegExp ← "a"': "muss ein RegExp-Objekt sein, ist aber eine Zeichenkette",
			"Error ← {}": "muss ein Error-Objekt sein, ist aber ein Objekt",
			"Promise ← 1": "muss ein Promise sein, ist aber eine Zahl",
			"Uint8Array ← []": "muss ein Uint8Array sein, ist aber ein Array",
			"instanceOf ← 1970-01-01T00:00:00.000Z":
				"muss eine Instanz von Foo sein, ist aber ein Date-Objekt",
			'/^a.*$/ ← "b"': 'muss dem Muster ^a.*$ entsprechen, ist aber "b"',
			'/a/i ← "b"': 'muss dem Muster a entsprechen, ist aber "b"',
			"narrow named ← 3": "muss gemäß isEven gültig sein, ist aber 3",
			"narrow anonymous ← 1":
				"muss gemäß einem anonymen Prädikat gültig sein, ist aber 1",
			"narrow mustBe ← -1":
				"muss ein Wert gemäß der Beschreibung „positiv“ sein, ist aber -1",
			'pipe.try anonymous ← "{"':
				"konnte nicht verarbeitet werden:\n    Error: kaputt",
			'pipe.try named ← "{"':
				"konnte von parse nicht verarbeitet werden:\n    Error: kaputt",
			"required string ← {}": "a fehlt (muss eine Zeichenkette sein)",
			"required boolean ← {}": "a fehlt (muss ein Wahrheitswert sein)",
			"required never ← {}": "a fehlt (muss never sein)",
			"required unknown ← {}": "a fehlt",
			"required unknown | string ← {}":
				"a fehlt (muss eine Zeichenkette oder ein beliebiger Wert sein)",
			"required string | number | Date ← {}":
				"a fehlt (muss eine Zahl, eine Zeichenkette oder ein Date-Objekt sein)",
			"required units ← {}": 'a fehlt (muss 1n; "x"; "y" oder 1,5 sein)',
			"required described unit ← {}":
				"a fehlt (muss ein Wert gemäß der Beschreibung „ein x“ sein)",
			"required instanceOf ← {}": "a fehlt (muss eine Instanz von Foo sein)",
			"required string.uuid | number ← {}":
				"a fehlt (muss eine Zahl oder eine Zeichenkette sein)",
			"required string.email | string.uuid ← {}":
				"a fehlt (muss eine Zeichenkette sein)",
			"required string.date.epoch.parse ← {}":
				"a fehlt (muss ein gültiger Unix-Zeitstempel als ganzzahlige Zeichenkette sein)",
			"required number.epoch ← {}": "a fehlt (muss eine Zahl sein)",
			'required, two at one path ← {"b":""}':
				"a fehlt (muss eine Zahl oder eine Zeichenkette sein)",
			"required in a union ← {}":
				"a fehlt (muss never sein) oder b fehlt (muss ein Wahrheitswert sein)",
			"required union in a union ← {}": "a fehlt (muss 1, 2 oder 3 sein)",
			'undeclared ← {"a":"","b":1}': "b ist nicht erlaubt",
			'undeclared in a union ← {"a":"","b":"y"}':
				'b muss eine Zahl oder entfernt sein, ist aber "y"',
			'discriminant ← {"kind":"triangle"}':
				'kind muss "circle" oder "square" sein, ist aber "triangle"',
			"discriminant absent ← {}":
				'kind fehlt (muss "circle" oder "square" sein)',
			'discriminant described ← {"kind":"triangle"}':
				"muss ein Wert gemäß der Beschreibung „eine Form“ sein, ist aber ein Objekt",
			"discriminant described branches ← true":
				"muss ein Wert gemäß der Beschreibung „eine Anzahl“ oder eine Zeichenkette sein, ist aber ein Wahrheitswert",
			'discriminant numbers ← {"k":3.5}':
				"k muss 1,5 oder 2,5 sein, ist aber 3,5",
			'discriminant bigints ← {"k":"3n"}':
				"k muss 1n oder 2n sein, ist aber 3n",
			'discriminant units ← "d"': 'muss "a", "b" oder "c" sein, ist aber "d"',
			"discriminant domains ← true":
				"muss ein BigInt, eine Zahl, eine Zeichenkette oder ein Objekt sein, ist aber ein Wahrheitswert",
			'discriminant in an outer union ← {"a":{"kind":"triangle"}}':
				'a muss eine Zeichenkette sein (ist ein Objekt) oder a.kind muss "circle" oder "square" sein (ist "triangle")',
			"discriminant unreadable ← 5": "muss ein Objekt sein, ist aber eine Zahl",
			'discriminant beside a default ← {"id":5}':
				"id muss 0 oder 1 sein (ist 5) oder name fehlt (muss eine Zeichenkette sein)",
			'discriminant cases beside a default ← "d"':
				'muss "a", "b", "c" oder mindestens 6 Zeichen lang sein, ist aber "d"',
			"union of paths ← {}":
				"a fehlt (muss eine Zeichenkette sein) oder b fehlt (muss eine Zahl sein)",
			"union described ← {}":
				"muss ein Wert gemäß der Beschreibung „ein a oder b“ sein, ist aber ein Objekt",
			"union boolean | null ← 1": "muss false, null oder true sein, ist aber 1",
			'union of lengths ← "a"':
				"muss leer oder mindestens 3 Zeichen lang sein, ist aber 1 Zeichen lang",
			"union of array lengths ← [0]":
				"muss ein leeres Array oder ein Array mit mindestens 3 Elementen sein, ist aber ein Array mit 1 Element",
			"union of signs ← -1":
				"muss kleiner als -10 oder mindestens 0 sein, ist aber -1",
			"union of decimals ← 4": "muss 1,5; 2,5 oder 3,5 sein, ist aber 4",
			'union with an authored branch ← "a"':
				'muss eine E-Mail-Adresse oder ein Wert gemäß der Beschreibung „ein Benutzername“ sein, ist aber "a"',
			'union with a narrow ← "ab"':
				'muss mindestens 5 Zeichen lang oder gemäß isUpper gültig sein, ist aber "ab"',
			"union at an index ← [true]":
				"Wert an [0] muss eine Zahl oder eine Zeichenkette sein, ist aber ein Wahrheitswert",
			"never ← 5": "muss never sein, ist aber 5",
			'never at a path ← {"a":1}': "a muss never sein, ist aber 1",
			"intersection ← 3":
				"(3) muss alles Folgende sein:\n  ◦ gerade\n  ◦ größer als 10",
			"intersection with an authored constraint ← 3":
				"(3) muss alles Folgende sein:\n  ◦ gerade\n  ◦ ein Wert gemäß der Beschreibung „zweistellig“",
			'path ← {"user":{"address":{"zip":5}}}':
				"user.address.zip muss eine Zeichenkette sein, ist aber eine Zahl",
			'path at an index ← ["a",1]':
				"Wert an [1] muss eine Zeichenkette sein, ist aber eine Zahl",
			'path through an index ← {"a":[1]}':
				"a[0] muss eine Zeichenkette sein, ist aber eine Zahl",
			'path of a quoted key ← {"a b":1}':
				'Wert an ["a b"] muss eine Zeichenkette sein, ist aber eine Zahl',
			"titled at the root ← 5":
				"muss eine Zeichenkette sein, ist aber eine Zahl",
			'titled ← {"name":5}':
				"„Name“ muss eine Zeichenkette sein, ist aber eine Zahl",
			'titled length ← {"name":"a"}':
				"„Name“ muss mindestens 3 Zeichen lang sein, ist aber 1 Zeichen lang",
			"titled required ← {}": "„Name“ fehlt (muss eine Zeichenkette sein)",
			'titled at an index ← ["a",1]':
				"„Name“ an [1] muss eine Zeichenkette sein, ist aber eine Zahl",
			'titled through an index ← {"list":[1]}':
				"„Name“ an list[0] muss eine Zeichenkette sein, ist aber eine Zahl",
			'titled, two constraints ← {"n":3}':
				"„Anzahl“ (3) muss alles Folgende sein:\n  ◦ gerade\n  ◦ größer als 10",
			"titled, two constraints at an index ← [3]":
				"„Anzahl“ an [0] (3) muss alles Folgende sein:\n  ◦ gerade\n  ◦ größer als 10",
			'titled enum ← {"s":"c"}': '„Name“ muss "a" oder "b" sein, ist aber "c"',
			'titled discriminated enum ← {"s":"d"}':
				'„Name“ muss "a", "b" oder "c" sein, ist aber "d"',
			'titled domains ← {"v":true}':
				"„Name“ muss eine Zahl oder eine Zeichenkette sein, ist aber ein Wahrheitswert",
			"titled union of paths ← {}":
				"„Name“ fehlt (muss eine Zeichenkette sein) oder „Alter“ fehlt (muss eine Zahl sein)",
			"described ← 5":
				"muss ein Wert gemäß der Beschreibung „ein Benutzername“ sein, ist aber eine Zahl",
			"configured expected ← 5":
				"muss ein Wert gemäß der Beschreibung „ein Name“ sein, ist aber eine Zahl",
			'described length ← "a"':
				"muss ein Wert gemäß der Beschreibung „ein Benutzername“ sein, ist aber 1 Zeichen lang",
			"described array length ← [0]":
				"muss ein Wert gemäß der Beschreibung „ein Paar“ sein, ist aber ein Array mit 1 Element",
			'actual suppressed ← "ez"': "muss mindestens 8 Zeichen lang sein",
			'configured actual of an empty value ← ""':
				"darf nicht leer sein, ist aber zu kurz",
			"actual suppressed array ← [0]": "muss mindestens 2 Elemente enthalten",
			"configured writer reading the description ← 3":
				"muss more than 5 (!) sein, ist aber 3",
			'number.epoch ← "x"':
				"muss ein Unix-Zeitstempel als Zahl sein, ist aber eine Zeichenkette",
			"object.json ← Map":
				"muss ein einfaches Objekt oder Array sein, ist aber ein Objekt",
			'string.alpha ← " x"': 'muss rein alphabetisch sein, ist aber " x"',
			'string.alphanumeric ← " x"':
				'muss rein alphanumerisch sein, ist aber " x"',
			'string.base58 ← " x"': 'muss Base58-kodiert sein, ist aber " x"',
			'string.base64 ← "x"': 'muss Base64-kodiert sein, ist aber "x"',
			'string.base64.url ← "x"': 'muss Base64url-kodiert sein, ist aber "x"',
			'string.capitalize.preformatted ← "x"':
				'muss großgeschrieben sein, ist aber "x"',
			'string.creditCard ← "x"':
				'muss eine Kreditkartennummer sein, ist aber "x"',
			'string.date ← "x"': 'muss ein parsbares Datum sein, ist aber "x"',
			'string.date.iso ← "x"':
				'muss ein Datum oder Zeitpunkt nach ISO 8601 sein, ist aber "x"',
			'string.date.parse ← "x"': 'muss ein parsbares Datum sein, ist aber "x"',
			'string.digits ← "x"': 'muss eine Ziffernfolge (0-9) sein, ist aber "x"',
			'string.email ← "x"': 'muss eine E-Mail-Adresse sein, ist aber "x"',
			'string.hex ← "x"': 'muss rein hexadezimal sein, ist aber "x"',
			'string.integer ← "x"':
				'muss eine wohlgeformte ganzzahlige Zeichenkette sein, ist aber "x"',
			'string.integer.parse ← "9007199254740993"':
				'muss eine ganze Zahl im Bereich Number.MIN_SAFE_INTEGER bis Number.MAX_SAFE_INTEGER sein, ist aber "9007199254740993"',
			'string.ip ← "x"': 'muss eine IP-Adresse sein, ist aber "x"',
			'string.ip.v4 ← "x"': 'muss eine IPv4-Adresse sein, ist aber "x"',
			'string.ip.v6 ← "x"': 'muss eine IPv6-Adresse sein, ist aber "x"',
			'string.json ← "x"': "muss eine JSON-Zeichenkette sein (⟨SyntaxError⟩)",
			'string.json.parse ← "x"':
				"muss eine JSON-Zeichenkette sein (⟨SyntaxError⟩)",
			'string.lower.preformatted ← "X"':
				'muss kleingeschrieben sein, ist aber "X"',
			'string.numeric ← "x"':
				'muss eine wohlgeformte numerische Zeichenkette sein, ist aber "x"',
			'string.numeric.parse ← "1e400"': 'muss endlich sein, ist aber "1e400"',
			'string.regex ← "("':
				"muss ein Regex-Muster sein (SyntaxError: Invalid regular expression: /(/: Unterminated group)",
			'string.semver ← "x"':
				'muss eine semantische Version (siehe https://semver.org/) sein, ist aber "x"',
			'string.trim.preformatted ← " x"':
				'muss ohne Leerraum am Anfang und Ende sein, ist aber " x"',
			'string.upper.preformatted ← "x"':
				'muss durchgehend großgeschrieben sein, ist aber "x"',
			'string.url ← "x"': 'muss eine URL sein, ist aber "x"',
			'string.url.parse ← "x"': 'muss eine URL sein, ist aber "x"',
			'string.uuid ← "x"': 'muss eine UUID sein, ist aber "x"',
			'string.uuid.v1 ← "x"': 'muss eine UUIDv1 sein, ist aber "x"',
			'string.uuid.v2 ← "x"': 'muss eine UUIDv2 sein, ist aber "x"',
			'string.uuid.v3 ← "x"': 'muss eine UUIDv3 sein, ist aber "x"',
			'string.uuid.v4 ← "x"': 'muss eine UUIDv4 sein, ist aber "x"',
			'string.uuid.v5 ← "x"': 'muss eine UUIDv5 sein, ist aber "x"',
			'string.uuid.v6 ← "x"': 'muss eine UUIDv6 sein, ist aber "x"',
			'string.uuid.v7 ← "x"': 'muss eine UUIDv7 sein, ist aber "x"',
			'string.uuid.v8 ← "x"': 'muss eine UUIDv8 sein, ist aber "x"',
			'string.json.parse ← ""':
				"muss eine JSON-Zeichenkette sein, ist aber leer",
			"number.epoch ← 1.5":
				"muss ein Unix-Zeitstempel als ganze Zahl sein, ist aber 1,5",
			"number.epoch ← -900000000000000000000":
				"muss ein Unix-Zeitstempel ab -8640000000000000 sein, ist aber -900000000000000000000"
		})
	})

	it("writes none of en's frames", () => {
		attest(
			Object.values(matrixOf(de)).filter(message =>
				/must be|\(was |missing|according to|value at/.test(message)
			)
		).equals([])
	})

	it("renders each keyword phrase an error carries", () => {
		const labels = Object.keys(matrixOf(de))
		attest(
			Object.keys(keywordPhrases).filter(
				alias => !labels.some(label => label.startsWith(`${alias} ←`))
			)
		).snap([
			"FormData.parsed",
			"string.date.epoch",
			"string.normalize.NFC.preformatted",
			"string.normalize.NFD.preformatted",
			"string.normalize.NFKC.preformatted",
			"string.normalize.NFKD.preformatted"
		])
	})

	it("lists as Intl.ListFormat does", () => {
		const or = new ListFormat("de", { type: "disjunction" })
		const and = new ListFormat("de", { type: "conjunction" })
		for (let n = 0; n <= 5; n++) {
			const items = ["a", "b", "c", "d", "e"].slice(0, n)
			attest(de.list(items, "or")).equals(or.format(items))
			attest(de.list(items, "and")).equals(and.format(items))
		}
	})

	it("pluralizes as Intl.PluralRules does", () => {
		const rules = new Intl.PluralRules("de")
		for (const n of [0, 1, 2, 21, 1.5])
			attest(de.plural(n)).equals(rules.select(n) as never)
	})

	it("formats numbers as Intl.NumberFormat does without grouping", () => {
		const format = new Intl.NumberFormat("de", {
			useGrouping: false,
			maximumFractionDigits: 20
		})
		for (const n of [0, 1, -1.5, 0.0001, 1234567.25, 9007199254740991])
			attest(de.number(n)).equals(format.format(n))
	})

	it("renders when configured", () => {
		withConfig({ locale: de }, () =>
			attest(scope({}).type({ name: "string" })({}).toString()).snap(
				"name fehlt (muss eine Zeichenkette sein)"
			)
		)
		withConfig({ locale: () => de }, () =>
			attest(type("string >= 3")("ab").toString()).snap(
				"muss mindestens 3 Zeichen lang sein, ist aber 2 Zeichen lang"
			)
		)
	})

	// https://github.com/arktypeio/arktype/issues/1412
	it("writes constraints described alike once", () => {
		const Email = type("string.email > 0", "@", "Email is not valid")
		attest(Email("").toLocaleString(de)).snap(
			'muss ein Wert gemäß der Beschreibung „Email is not valid“ sein, ist aber ""'
		)
	})

	it("can be spread to change one sentence", () => {
		const deCompact = {
			...de,
			minLength: {
				...de.minLength,
				problem: e => `ist zu kurz (mindestens ${e.rule})`
			}
		} satisfies Locale.Complete
		attest(type("string >= 3")("ab").toLocaleString(deCompact)).snap(
			"ist zu kurz (mindestens 3)"
		)
		// a described node's text is cited by the shared problem
		attest(
			type("string >= 3")
				.describe("ein Benutzername")("ab")
				.toLocaleString(deCompact)
		).snap(
			"muss ein Wert gemäß der Beschreibung „ein Benutzername“ sein, ist aber 2 Zeichen lang"
		)
	})

	it("can be spread to write descriptions as German", () => {
		const deDescribed: Locale = { ...de, cite: text => text }
		attest(
			type("string >= 3")
				.describe("ein Benutzername")("ab")
				.toLocaleString(deDescribed)
		).snap("muss ein Benutzername sein, ist aber 2 Zeichen lang")
		attest(
			type({ a: type("'x'").describe("ein x") })({}).toLocaleString(deDescribed)
		).snap("a fehlt (muss ein x sein)")
	})
})
