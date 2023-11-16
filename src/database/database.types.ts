

export interface HistoryOpt {
	prevDataObject?: any,
	dataObject: any,
	kind: string,
	pKind?: string,
	id: string,
	pId?: string,
	user: string,
	time: Date,
	action: string
}

export interface CursorTypes {
	films?: string,
	companies?: string,
	people?: string,
	content?: string,
	users?: string
}