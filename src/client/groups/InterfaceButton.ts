import Konva from 'konva';
import { GroupLayoutData } from "~/client_types";
import { Button } from './Button';
export abstract class InterfaceButton extends Button {


    constructor(stage: Konva.Stage, layout: GroupLayoutData, callback: Function) {
        super(stage, layout, callback)
    }
}
