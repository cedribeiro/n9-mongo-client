export function toDate(value: string): Date {
	return new Date(value);
}

export function toString(value: Date): string {
	return JSON.stringify(value);
}

export function transform(value: Date | string): Date | string {
	if (typeof value === 'string') return toDate(value);
	else return toString(value);
}
