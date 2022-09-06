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
	HttpStatus
} from '@nestjs/common';

@Controller('series')
export class SeriesController {

	@Get()
	findAll(): object {
		return {
			name: "The Mating Game",
			year: 2006,
			channel: "SABC 3",
			type: "fiction",
			genre: "drama"
		}
	}
}
