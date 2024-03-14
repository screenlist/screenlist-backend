export interface HistoryOpt {
	prevDataObject?: any,
	dataObject: any,
	kind: Collection,
	pKind?: Collection,
	id: string,
	pId?: string,
	user: string,
	time: Date,
	action: 'create' | 'update' | 'delete'
}

export interface HistoryX {
	id: string;
	xBefore?: any;
	xAfter: any;
	xIdentifier: string;
	wIdentifier?: string; // Parent Identifier, if any.
	xKind: Collection;
	wKind?: Collection; // Parent Kind, if any.
	xAction: 'create' | 'update' | 'delete';
	xUser: string;
	xTimestamp: Date;
}

export interface DecodedHistory {
	before: any;
	after: any;
	property: string;
	message: 'update' |'create' | 'delete';
	userUid: string;
	time: Date;
	id: string;
	oid: string;
}

export interface Hit {
	id: string;
	collection: Collection;
	identifier: string;
	time: Date
}

export interface CursorTypes {
	films?: string,
	companies?: string,
	people?: string,
	content?: string,
	users?: string
}

export type ImmutableFields = {
	id: string
}

export type Collection = 'films' | 'photos' | 'companies' | 'content' | 'people' | 'roles' | 'users' | 'requests' | 'history' | 'ratings' | 'today' | 'hits';

export type CollectionFields<T> = Array<keyof T>;