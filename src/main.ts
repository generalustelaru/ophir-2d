import constants from './constants.json';
import { CommunicationInterface, MapBoardInterface } from './types';
import { CommunicationService } from './services/commService';
import { MapBoardService } from './services/mapBoardService.js';
import { EventHandler } from './eventHandler';

const { CONNECTION } = constants;

new EventHandler(); // Enables inter-class communication

const commService: CommunicationInterface = CommunicationService.getInstance();
commService.createConnection(CONNECTION.wsAddress);

const mapBoardService: MapBoardInterface = MapBoardService.getInstance();
mapBoardService.initiateCanvas();
