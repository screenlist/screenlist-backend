import { 
	Injectable, 
	ParseFileOptions, 
	BadRequestException, 
	NotFoundException, 
	UnauthorizedException 
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SeriesService {
	constructor(
		private configService: ConfigService,
		private datastore: DatabaseService
	){
		this.datastore = new DatabaseService(configService)
	}
}
