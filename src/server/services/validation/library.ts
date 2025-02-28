export type ValidationResponse = {
    passed: boolean,
    error: string
}


function hasKey(parent: object, key: string): ValidationResponse {

    if (parent !== null && key in parent)
        return pass();

    return fail(`"${key}" property is missing.`);
}

function pass(): ValidationResponse {

    return {
        passed: true,
        error: '',
    }
}

function fail(error: string): ValidationResponse {

    return {
        passed: false,
        error
    }
}

export const lib = {

    hasRecord: (parent: object, key: string, nullable: boolean = false): ValidationResponse => {
        const keyTest = hasKey(parent, key);

        if (keyTest.passed) {
            const prop = parent[key as keyof object] as unknown;

            if (nullable && prop === null)
                return pass();

            if (
                typeof prop === 'object'
                && prop !== null
                && Object.keys(prop).length
            )
                return pass();

            return fail(`${key} property is not a valid object: ${prop}`)
        }

        return fail(keyTest.error)
    },

    hasString: (parent: object, key: string, nullable: boolean = false): ValidationResponse => {
        const keyTest = hasKey(parent, key);

        if (keyTest.passed) {
            const prop = parent[key as keyof object] as unknown;

            if (nullable && prop === null)
                return pass();

            if (typeof prop === 'string' && prop.length)
                return pass();

            return fail(`${key} property is not a valid string: ${prop}`);
        }

        return fail(keyTest.error);
    }
}
