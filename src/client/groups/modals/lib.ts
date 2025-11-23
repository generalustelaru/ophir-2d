import { TradeGoodSymbol } from '~/client_types';
import { TradeGood } from '~/shared_types';

function throwRenderError(reason: string) {
    throw new Error(`Cannot render modal! ${reason}`);
}

function getFeasibleSymbols(
    requested: Array<TradeGood>,
    missing: Array<TradeGood>,
): Array <TradeGoodSymbol> {
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

export const lib ={
    throwRenderError,
    getFeasibleSymbols,
};