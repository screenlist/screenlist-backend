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

	@Get(':id')
	findOne(): object {
		return {
			name: "The Mating Game",
			year: 2006,
			channel: "SABC 3",
			type: "fiction",
			genre: "drama"
		}
	}

	@Post(':id')
	addOne(): object {
		return {
			name: "The Mating Game",
			year: 2006,
			channel: "SABC 3",
			type: "fiction",
			genre: "drama"
		}
	}

	@Patch(':id')
	updateOne(): object {
		return {
			name: "The Mating Game",
			year: 2006,
			channel: "SABC 3",
			type: "fiction",
			genre: "drama"
		}
	}
}
