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
@UseGuards(RolesGuard)
export class SearchController {
	constructor(private search: SearchService){}
	
	@Get()
	async searchFunction(){
		return await this.search.getAllCollections()
	}

	@Post('create')
	@Roles('admin')
	async create(){
		return await this.search.createCollections()
	}

	@Post('index')
	@Roles('admin')
	async index(){
		return await this.search.indexAll()
	}

	@Post('delete')
	@Roles('admin')
	async delete(){
		return await this.search.deleteAllCollections()
	}
}
