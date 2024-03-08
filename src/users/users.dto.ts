import { 
	IsOptional, 
	IsNotEmpty,
	IsString, 
	IsEmpty,
	IsArray
} from 'class-validator';

export class UpdateUserDto {
	@IsOptional()
	@IsString()
	publication?: string;

	@IsOptional()
	@IsArray()
	favouriteFilms?: string[]
}

export class CreateRequestDto {
	@IsOptional()
	@IsEmpty()
	@IsString()
	request: string;

	@IsOptional()
	@IsEmpty()
	@IsString()
	requestSubject: string;

	@IsNotEmpty()
	@IsString()
	notes: string;
}

export class UpdateRequestDto {
	@IsOptional()
	@IsEmpty()
	@IsString()
	request?: string;

	@IsOptional()
	@IsEmpty()
	@IsString()
	requestSubject?: string;

	@IsOptional()
	@IsString()
	notes?: string;
}