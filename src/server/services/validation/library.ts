export type ValidationResult = {
    passed: boolean,
    error: string
}

function pass(): ValidationResult {

    return { passed: true, error: '' }
}

function fail(error: string): ValidationResult {

    return { passed: false, error }
}

function hasKey(parent: object, key: string): ValidationResult {

    if (parent !== null && key in parent)
        return pass();

    return fail(`"${key}" property is missing.`);
}

export const lib = {

    hasRecord: (parent: object, key: string, nullable: boolean = false): ValidationResult => {
        const keyTest = hasKey(parent, key);

        if (keyTest.passed) {
            const value = parent[key as keyof object] as unknown;

            if (nullable && value === null)
                return pass();

            if (
                typeof value === 'object'
                && value !== null
                && Object.keys(value).length
            )
                return pass();

            return fail(`${key} property is not a valid object: ${value}`)
        }

        return fail(keyTest.error)
    },

    hasString: (parent: object, key: string, nullable: boolean = false): ValidationResult => {
        const keyTest = hasKey(parent, key);

        if (keyTest.passed) {
            const value = parent[key as keyof object] as unknown;

            if (nullable && value === null)
                return pass();

            if (typeof value === 'string' && value.length)
                return pass();

            return fail(`${key} property is not a valid string: ${value}`);
        }

        return fail(keyTest.error);
    }
}
