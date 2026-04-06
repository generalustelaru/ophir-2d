import { CargoMetal, Commodity, ItemName, Metal } from '~/shared_types';
import { Probable } from '~/server_types';
import { PlayStateHandler } from '../../state_handlers/PlayStateHandler';
import { ProcessorTools as lib } from '../ProcessorTools';

export class CargoManipulator {

    public static loadItem(cargo: Array<ItemName>, item: ItemName, playState: PlayStateHandler): Probable<Array<ItemName>> {
        const filled = cargo.filter(item => item != 'empty') as Array<ItemName>;
        const empty = cargo.filter(item => item == 'empty') as Array<ItemName>;
        const orderedCargo = filled.concat(empty);

        const emptyIndex = orderedCargo.indexOf('empty');

        if (emptyIndex == -1)
            return lib.fail('Could not find an empty slot to load item');

        const metals: Array<ItemName> = ['gold', 'silver'];
        const supplies = playState.getItemSupplies();

        if (metals.includes(item)) {
            const metal = item as Metal;

            if (supplies.metals[metal] < 1)
                return lib.fail(`No ${item} available for loading`);

            if (orderedCargo[emptyIndex + 1] != 'empty')
                return lib.fail('Not enough empty slots for storing metal');

            orderedCargo[emptyIndex] = item;
            orderedCargo[emptyIndex + 1] = `${item}_extra` as CargoMetal;
            playState.removeMetal(metal);

            return lib.pass(orderedCargo);
        }

        const commodity = item as Commodity;

        if (supplies.commodities[commodity] < 1)
            return lib.fail(`No ${item} available for loading`);

        orderedCargo[emptyIndex] = item;
        playState.removeCommodity(commodity);

        return lib.pass(orderedCargo);
    }

    public static unloadItem(
        pool: Array<ItemName>, item: ItemName, playState: PlayStateHandler, isPlayerCargo: boolean = true,
    ): Probable<Array<ItemName>> {
        const itemIndex = pool.indexOf(item);

        const strip = (items: Array<ItemName>, index: number, useEmpty: boolean) => {
            useEmpty
                ? items.splice(index, 1, 'empty')
                : items.splice(index, 1);
        };

        if (itemIndex === -1)
            return lib.fail(`Cannot find [${item}] in item pool!`);

        strip(pool, itemIndex, isPlayerCargo);

        const metals: Array<ItemName> = ['gold', 'silver'];

        if (metals.includes(item)) {
            strip(pool, itemIndex + 1, isPlayerCargo);
            playState.returnMetal(item as Metal);
        } else {
            playState.returnCommodity(item as Commodity);
        }

        return lib.pass(pool);
    }

    public static subtractItems(
        minuend: Array<ItemName>,
        subtrahend: Array<ItemName>,
        playState: PlayStateHandler,
        isPlayerCargo: boolean = true,
    ): Probable<Array<ItemName>> {
        const pool = [...minuend];

        for (const item of subtrahend) {
            const subtractionResult = CargoManipulator.unloadItem(pool, item, playState, isPlayerCargo);

            if (subtractionResult.err)
                return subtractionResult;
        }

        return lib.pass(pool);
    }
}
