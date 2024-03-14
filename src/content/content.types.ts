export interface Content {
	id: string;
	authorName: string;
	authorId: string;
	headline: string;
	summary: string;
	body: string,
	tags: string[];
	slug: string;
	type: 'blog' | 'tos' | 'about' | 'contributions' | 'privacy';
	created: Date,
	lastUpdated: Date
}


export interface ContentOpt {
	user: string,
	time: Date,
	contentId?: string
}