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

@Controller('films')
export class FilmsController {

	@Get()
	findAll(): object {
		return {
			name: "Of Good Report",
			year: 2013,
			premier: "Durban Internation Film Festival",
			type: "fiction",
			genre: "thriller"
		}
	}
}
