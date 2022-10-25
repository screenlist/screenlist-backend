export interface Content {
	author: string,
	headline: string,
	summary: string,
	headerImageUrl: string,
	body: string,
	tags: [{
		kind: string,
		id: string,
		displayName: string
	}];
	created: Date,
	lastUpdated: Date
}


export interface ContentOpt {
	userName: string,
	user: string,
	time,
	contentId: string
}