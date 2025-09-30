import { 
	Controller, 
	Get,
	Post,
	Put,
	Delete,
	Patch,
	Body,
	Param,
	Query,
	Headers,
	UseGuards
} from '@nestjs/common';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { SearchService } from './search.service'

@Controller('search')
export class SearchController {
	constructor(private search: SearchService){}
	
	@Get()
	async searchFunction(){
		return await this.search.getAllCollections()
	}

	@Get('create')
	async createCollections(){ return await this.search.createCollections() }

	@Get('index')
	async indexAll(){ return await this.search.indexAll() }

	@Get('delete')
	async deleteCollection(){ return await this.search.deleteAllCollections() }
}
