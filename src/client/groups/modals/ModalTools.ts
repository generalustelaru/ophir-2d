import { CommoditySymbol } from '~/client_types';
import { Commodity } from '~/shared_types';

export class ModalTools {

    public static throwRenderError(reason: string) {
        throw new Error(`Cannot render modal! ${reason}`);
    }

    public static getFeasibleSymbols(
        requested: Array<Commodity>,
        missing: Array<Commodity>,
    ): Array <CommoditySymbol> {
        const unaccounted = [...missing];
        const symbols = requested.map(req => {
            if (unaccounted.includes(req)) {
                unaccounted.splice(unaccounted.indexOf(req), 1);

                return 'other';
            }

            return req;
        });

        return symbols;
    }
}
