export interface UserExt {
	id: string;
	username: string;
	fullName: string;
	role: UserRoles;
	reputation: number; // min 0
	favouriteFilms: string[]
	publication?: string;
	criticScore?: number; // min 0; max 100
	created: Date;
	lastUpdated: Date;
}

export type UserRoles = 'admin' | 'curator' | 'moderator' | 'journalist' | 'member';

export interface Request {
	id: string,
	request: string,
	requestSubject: string,
	notes: string,
	approved: boolean,
	acknowledged: boolean,
	createdBy: string,
	created: Date,
	lastUpdated: Date,
}

// Util
export interface UserOpt {
	time: Date,
	user: string,
	userName?: string,
	objectId?: string
}

export interface RequestOpt {
	time: Date,
	user: string,
	userName?: string,
	requestId?: string
}