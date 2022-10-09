export interface User {
	uid: string,
	role: string,
	lastUpdated: Date,
	created: Date
}

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
	objectId?: string
}

export interface VoteOpt {
	time: Date,
	user: string,
	votesId?: string
}

export interface RequestOpt {
	time: Date,
	user: string,
	requestId?: string
}