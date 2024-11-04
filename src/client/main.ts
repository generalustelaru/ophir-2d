import sharedConstants from '../shared_constants';
import { CommunicationService, CommunicationInterface } from './services/CommService';
import { CanvasService, CanvasInterface } from './services/CanvasService';
import { EventHandler } from './eventHandler';

const { CONNECTION } = sharedConstants;

new EventHandler(); // Enables inter-class communication

const commService: CommunicationInterface = CommunicationService.getInstance();
commService.createConnection(CONNECTION.wsAddress);

const canvasService: CanvasInterface = CanvasService.getInstance();
canvasService.initiateCanvas();
