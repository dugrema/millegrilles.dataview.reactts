import { expose } from 'comlink';
import { AppsEncryptionWorker } from './encryption';

const WORKER = new AppsEncryptionWorker();
expose(WORKER);
