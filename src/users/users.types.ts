export interface User {
	uid: string,
	userName: string,
	bio: string,
	role: string,
	lastUpdated: Date,
	created: Date
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
	userToVoteFor?: string,
	userName?: string,
	votesId?: string
}

export interface RequestOpt {
	time: Date,
	user: string,
	userName?: string,
	requestId?: string
}