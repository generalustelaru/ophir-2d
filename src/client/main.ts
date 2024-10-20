import sharedConstants from '../shared_constants';
import { CommunicationService, CommunicationInterface } from './services/commService';
import { MapBoardService, MapBoardInterface } from './services/mapBoardService';
import { EventHandler } from './eventHandler';

const { CONNECTION } = sharedConstants;

new EventHandler(); // Enables inter-class communication

const commService: CommunicationInterface = CommunicationService.getInstance();
commService.createConnection(CONNECTION.wsAddress);

const mapBoardService: MapBoardInterface = MapBoardService.getInstance();
mapBoardService.initiateCanvas();
