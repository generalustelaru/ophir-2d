
export class ToolService {

    /**
     * Deep copy a data object
     * 'cc' stands for carbon copy/copycat/clear clone/cocopuffs etc.
     *
     * @param obj - JSON-compatible object to copy
     */
    public getCopy<O extends object>(obj: O): O {

        return JSON.parse(JSON.stringify(obj));
    }

    public parse(json: string): object | null {
        const value = JSON.parse(json);

        if (
            typeof value !== null
            && (
                (typeof value === 'object' && Object.keys(value).length)
                || (Array.isArray(value) && value.length)
            )
        )
            return value as object;

        console.error('Invalid or empty data.', json);

        return null;
    }
}
