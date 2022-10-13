export interface SuperUser {
	uid: string,
	role: string,
	lastUpdated: Date,
	created: Date
}

export interface BasicUser {
	userName: string,
	uid: string,
	bio: string,
	created: Date,
	lastUpdated: Date
}

export type UserRoles = 'admin' | 'curator' | 'moderator' | 'journalist' | 'member';

export interface Votes {
	id: string,
	roleToAttain: string,
	userSuggested: string,
	success: boolean,
	totalPointsNeeded: number,
	adminsTotalPoints: number,
	curatorsTotalPoints: number,
	moderatorsTotalPoints: number,
	lastUpdated: Date,
	created: Date
}

export interface Request {
	id: string,
	request: string,
	requestSubject: string,
	notes: string,
	approved: boolean,
	createdBy: string,
	created: Date,
	lastUpdated: Date,
}

export interface JournalistInfo {
	id: string,
	description: string,
	url: string,
	created: Date,
	lastUpdated: Date
}

// Util
export interface UserOpt {
	time: Date,
	user: string,
	userName?: string,
	objectId?: string
}

export interface VoteOpt {
	time: Date,
	user: string,
	userName?: string,
	votesId?: string
}

export interface RequestOpt {
	time: Date,
	user: string,
	userName?: string,
	requestId?: string
}