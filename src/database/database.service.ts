import { Injectable } from '@nestjs/common';
import { Datastore } from '@google-cloud/datastore';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService extends Datastore{
	constructor(private configService: ConfigService){
		super({
			projectId: configService.get('PROJECT_ID'),
			keyFilename: path.join(__dirname, '../../db.json')
		})
	}

	formulateHistory(data: any, kind: string, id: number|string, user: string, action: string){
		const key = this.key('History');
		const history = data;
		history.entityKind = kind;
		history.entityIdentifier = id;
		history.resultingAction = action;
		history.triggeredByUser = user;
		return {
			key: key,
			data: history
		}
	}
}