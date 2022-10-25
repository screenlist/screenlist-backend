export class CreateContentDto {
	author: string;
	headline: string;
	summary: string;
	headerImageUrl: string;
	body: string;
	tags: [{
		kind: string,
		id: string,
		displayName: string
	}];
	created: Date;
	lastUpdated: Date;
}

export class UpdateContentDto {
	author: string;
	headline: string;
	summary: string;
	headerImageUrl: string;
	body: string;
	tags: [{
		kind: string,
		id: string,
		displayName: string
	}];
	lastUpdated: Date;
}