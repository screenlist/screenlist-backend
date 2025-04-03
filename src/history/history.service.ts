import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { DatabaseService } from 'src/database/database.service';
import { ConfigService } from '@nestjs/config';
import { Request, UserExt } from 'src/users/users.types';
import { Person } from 'src/people/people.types';
import { CollectionFields } from 'src/database/database.types';
import { Film, Photo } from 'src/films/films.types';
import { Company, Role } from 'src/companies/companies.types';
import { Content } from 'src/content/content.types';
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
