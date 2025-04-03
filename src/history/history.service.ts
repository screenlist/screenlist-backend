import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { DatabaseService } from 'src/database/database.service';
import { ConfigService } from '@nestjs/config';
import { StorageService } from 'src/storage/storage.service';

@Injectable()
export class HistoryService {
	constructor(
		private auth: AuthService,
		private mongo: DatabaseService,
		private config: ConfigService,
		private blaze: StorageService
	){}
}
