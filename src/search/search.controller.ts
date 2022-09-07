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
	HttpException
} from '@nestjs/common';

@Controller('search')
export class SearchController {
	
	@Get()
	searchNow(): string {
		return "search here."
	}
}
