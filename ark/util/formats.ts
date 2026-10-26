// string formats read by char code, which decides them faster than their
// RegExps do. Each test accepts its RegExp's language. TurboFan's charCodeAt
// is slow past the end, so common strings are read within it
import { isDigitCode } from "./numbers.ts"

// unsigned, so codes below each range wrap above it
const isHexCode = (code: number) =>
	(code - 48) >>> 0 < 10 || ((code | 32) - 97) >>> 0 < 6

// 2 digits at i writing at most max
const isTwoDigitsAtMost = (s: string, i: number, max: number) => {
	const tens = s.charCodeAt(i) - 48
	const ones = s.charCodeAt(i + 1) - 48
	return tens >= 0 && ones >= 0 && ones <= 9 && tens * 10 + ones <= max
}

export const uuidMatcher: RegExp =
	/^(?:[\dA-Fa-f]{8}-[\dA-Fa-f]{4}-[1-8][\dA-Fa-f]{3}-[89ABab][\dA-Fa-f]{3}-[\dA-Fa-f]{12}|0{8}-(?:0{4}-){3}0{12}|f{8}-(?:f{4}-){3}f{12})$/

// its length rejects most strings before the RegExp, which costs ~210
// instructions to enter. A reader of its chars was no faster on valid ones
export const isUuid = (s: string): boolean =>
	s.length === 36 && uuidMatcher.test(s)

// based on https://github.com/validatorjs/validator.js/blob/master/src/lib/isIP.js
export const ipv4Matcher: RegExp =
	/^((?:(?:[1-9]|1\d|2[0-4])?\d|25[0-5])\.){3}(?:(?:[1-9]|1\d|2[0-4])?\d|25[0-5])$/

// the index after the segment at i, or -1
const ipv4SegmentEnd = (s: string, i: number, length: number) => {
	const first = i < length ? s.charCodeAt(i++) - 48 : -1
	if (!(first >= 0 && first <= 9)) return -1
	// a segment starting with 0 is 0
	if (first === 0 || i === length) return i
	const second = s.charCodeAt(i) - 48
	if (!(second >= 0 && second <= 9) || ++i === length) return i
	const third = s.charCodeAt(i) - 48
	if (!(third >= 0 && third <= 9)) return i
	return first * 100 + second * 10 + third <= 255 ? i + 1 : -1
}

// the index after an address at i, or -1
const ipv4AddressEnd = (s: string, i: number, length: number) => {
	i = ipv4SegmentEnd(s, i, length)
	for (let dots = 0; dots < 3; dots++) {
		if (i === -1 || i === length || s.charCodeAt(i) !== 46) return -1
		i = ipv4SegmentEnd(s, i + 1, length)
	}
	return i
}

export const isIpv4 = (s: string): boolean =>
	ipv4AddressEnd(s, 0, s.length) === s.length

// an address ends in two segments or an IPv4 address unless "::" ends it or
// precedes its last segment. Before those, a full address has 6 segments and
// a compressed one at most 5 around its "::". V8 compiles a copy of a
// non-capturing group per repetition when there are few, so those capture
export const ipv6Matcher: RegExp =
	/^(?:(?:(?:[\dA-Fa-f]{1,4}:){6}|::(?:[\dA-Fa-f]{1,4}:){0,5}|[\dA-Fa-f]{1,4}::(?:[\dA-Fa-f]{1,4}:){0,4}|([\dA-Fa-f]{1,4}:){2}:([\dA-Fa-f]{1,4}:){0,3}|([\dA-Fa-f]{1,4}:){3}:([\dA-Fa-f]{1,4}:){0,2}|(?:[\dA-Fa-f]{1,4}:){4}:([\dA-Fa-f]{1,4}:)?|(?:[\dA-Fa-f]{1,4}:){5}:)(?:[\dA-Fa-f]{1,4}:[\dA-Fa-f]{1,4}|((?:(?:[1-9]|1\d|2[0-4])?\d|25[0-5])\.){3}(?:(?:[1-9]|1\d|2[0-4])?\d|25[0-5]))|(?:([\dA-Fa-f]{1,4}:){1,6}|:):[\dA-Fa-f]{0,4}|(?:[\dA-Fa-f]{1,4}:){7}:)(%[\d.A-Za-z]+)?$/

// a zone's letters, digits and dots, from i to the end
const isZoneFrom = (s: string, i: number, length: number) => {
	if (i === length) return false
	while (i < length) {
		const code = s.charCodeAt(i++)
		if (!(isDigitCode(code) || code === 46 || ((code | 32) - 97) >>> 0 < 26))
			return false
	}
	return true
}

export const isIpv6 = (s: string): boolean => {
	const length = s.length
	let segments = 0
	let isCompressed = false
	// where the segment being read starts
	let start = 0
	// where the address ends, before a zone
	let end = 0
	for (; end < length; end++) {
		const code = s.charCodeAt(end)
		if (code === 58) {
			if (end !== start) {
				if (end - start > 4) return false
				segments++
			} else if (end === 0) {
				// "::" at the start
				if (s.charCodeAt(1) !== 58) return false
			} else if (isCompressed) return false
			else isCompressed = true
			start = end + 1
		} else if (!isHexCode(code)) {
			// an IPv4 address ends an address as its last 2 segments
			if (code === 46) {
				end = ipv4AddressEnd(s, start, length)
				if (end === -1 || (end !== length && s.charCodeAt(end) !== 37))
					return false
				segments += 2
				start = end
			} else if (code !== 37) return false
			break
		}
	}
	if (start !== end) {
		if (end - start > 4) return false
		segments++
	}
	// a colon ends an address only in "::"
	else if (s.charCodeAt(end - 1) === 58 && s.charCodeAt(end - 2) !== 58)
		return false
	return (
		(isCompressed ? segments < 8 : segments === 8) &&
		(end === length || isZoneFrom(s, end + 1, length))
	)
}

// ISO 8601 date/time modernized from https://github.com/validatorjs/validator.js/blob/master/src/lib/isISO8601.js
// Based on https://tc39.es/ecma262/#sec-date-time-string-format, the T
// delimiter for date/time is mandatory. Regex from validator.js strict matcher:
// only the two groups its backreferences read capture
export const iso8601Matcher: RegExp =
	/^[+-]?\d{4}(?!\d{2}\b)(?:(-?)(?:(?:0[1-9]|1[0-2])(?:\1(?:[12]\d|0[1-9]|3[01]))?|W(?:[0-4]\d|5[0-3])(?:-?[1-7])?|(?:00[1-9]|0[1-9]\d|[12]\d{2}|3(?:[0-5]\d|6[1-6])))(?:T(?:(?:(?:[01]\d|2[0-3])(?:(:?)[0-5]\d)?|24:?00)(?:[,.]\d+(?!:))?)?(?:\2[0-5]\d(?:[,.]\d+)?)?(?:[Zz]|[+-](?:[01]\d|2[0-3]):?(?:[0-5]\d)?)?)?)?$/

// YYYY-MM-DD
const isCalendarDate = (s: string) =>
	isTwoDigitsAtMost(s, 0, 99) &&
	isTwoDigitsAtMost(s, 2, 99) &&
	s.charCodeAt(4) === 45 &&
	isTwoDigitsAtMost(s, 5, 12) &&
	s.charCodeAt(7) === 45 &&
	isTwoDigitsAtMost(s, 8, 31) &&
	// a month or day of 0
	!(s.charCodeAt(5) === 48 && s.charCodeAt(6) === 48) &&
	!(s.charCodeAt(8) === 48 && s.charCodeAt(9) === 48)

// THH:mm:ss after a date, then maybe a fraction and Z or an offset ±HH:mm
const isTimeAfterDate = (s: string, length: number) => {
	if (
		s.charCodeAt(10) !== 84 ||
		!isTwoDigitsAtMost(s, 11, 23) ||
		s.charCodeAt(13) !== 58 ||
		!isTwoDigitsAtMost(s, 14, 59) ||
		s.charCodeAt(16) !== 58 ||
		!isTwoDigitsAtMost(s, 17, 59)
	)
		return false
	let i = 19
	if (i === length) return true
	let code = s.charCodeAt(i)
	// a fraction has a digit
	if (code === 46 || code === 44) {
		do if (++i === length) return i > 20
		while (isDigitCode((code = s.charCodeAt(i))))
		if (i === 20) return false
	}
	if (code === 90 || code === 122) return i + 1 === length
	return (
		(code === 43 || code === 45) &&
		i + 6 === length &&
		isTwoDigitsAtMost(s, i + 1, 23) &&
		s.charCodeAt(i + 3) === 58 &&
		isTwoDigitsAtMost(s, i + 4, 59)
	)
}

// YYYY-MM-DD, maybe with a time, as toISOString and most dates are written,
// is read by char code, and other forms by the RegExp. terser and swc would
// write each function it calls once where it's called, as a closure created
// at each call
export const isIso8601 = (s: string): boolean => {
	const length = s.length
	const code = s.charCodeAt(0)
	return (
		(isDigitCode(code) || code === 43 || code === 45) &&
		(((length === 10 || length >= 19) &&
			/* @__NOINLINE__ */ isCalendarDate(s) &&
			(length === 10 || /* @__NOINLINE__ */ isTimeAfterDate(s, length))) ||
			iso8601Matcher.test(s))
	)
}
