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
	Headers
} from '@nestjs/common';
import { SearchService } from './search.service'

@Controller('search')
export class SearchController {
	constructor(private search: SearchService){}
	
	@Get('quick')
	async quickSearch(
		@Query('film') film: string,
		@Query('series') series: string,
		@Query('company') company: string,
		@Query('person') person: string,
		@Query('platform') platform: string,
	) {
		if(film){
			return await this.search.quickSearch('film', film)
		} else if (series){
			return await this.search.quickSearch('series', series)
		} else if(company){
			return await this.search.quickSearch('company', company)
		} else if(person){
			return await this.search.quickSearch('person', person)
		} else if(platform){
			return await this.search.quickSearch('platform', person)
		}
	}
}
