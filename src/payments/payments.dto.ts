import { 
	IsOptional, 
	IsNotEmpty, 
	IsDate, 
	IsString, 
	IsBoolean,
	IsEmpty,
	MaxLength,
	IsFQDN,
	IsNumber
} from 'class-validator';

export class ChargeDto {
	@IsString()
	price: string;

	@IsString()
	email: string;

	@IsString()
	authCode: string;

	@IsString()
	reference: string;
}

export class ChargeForProduct {
	@IsString()
	@IsOptional()
	articleId?: string;

	@IsString()
	userUid: string;

	@IsBoolean()
	firstCharge: boolean;

	@IsString()
	redirect: string;

	@IsString()
	type: 'article' | 'plan' | 'prorate'

	@IsString()
	@IsOptional()
	receiverEmail?: string;

	@IsString()
	@IsOptional()
	proratedDays?: number;

	@IsString()
	@IsOptional()
	accessValidity?: 'month' | 'year';
}

export class SubscribeDto {
	@IsBoolean()
	monthly: boolean;

	@IsString()
	reference?: string;

	@IsString()
	@IsOptional()
	promo?: string;
}