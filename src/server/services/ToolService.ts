
export class ToolService {

    public isRecord(value: any): boolean {

        return value.constructor === Object && Object.keys(value).length > 0;
    }

    /**
     * Deep copy a data object
     * 'cc' stands for carbon copy/copycat/clear clone/cocopuffs etc.
     *
     * @param obj - JSON-compatible object to copy
     */
    public getCopy<O extends object>(obj: O): O {

        return JSON.parse(JSON.stringify(obj));
    }

    public parse<O extends object>(json: string): O | null {
        const value = JSON.parse(json);

        if (this.isRecord(value))
            return value;

        console.error('Invalid request format.', json);

        return null;
    }
}
