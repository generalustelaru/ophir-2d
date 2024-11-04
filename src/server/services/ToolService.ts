import { Service, ServiceInterface } from './Service';

export interface ToolInterface extends ServiceInterface {
    isRecord: (obj: object) => boolean;
    getCopy: <O extends object>(obj: O) => O;
}
export class ToolService extends Service implements ToolInterface {

    public isRecord(obj: object): boolean {

        return obj.constructor === Object && Object.keys(obj).length > 0;
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
}
