import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { HistoryOpt } from '../database/database.types';
import { StorageService } from '../storage/storage.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ContentService {
	constructor(
		private storage: StorageService,
		private db: DatabaseService
	){}
}
