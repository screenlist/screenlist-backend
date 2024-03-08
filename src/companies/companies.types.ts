import { Collection } from "src/database/database.types";

export interface Company {
	id: string;
	name: string;
	founded?: number;
	dateMonthFounded?: string;
	city?: string;
	country?: string;
	director?: string;
	founder?: string;
	foundingPlace?: string;
	description?: string;
	website?: string;
	editVerified: boolean;
	isHidden: boolean;
	editLocked: boolean;
	lastVerified: Date;
	created: Date;
	lastUpdated: Date;
}

export interface Role {
	id: string;
	parentCollection: 'people' | 'companies'
	parentName: string;
	parentId: string;
	ownerName: string;
	ownerCollection: 'films';
	ownerId: string;
	role: string; // Stands for Title in Person or Capacity in Company
	department?: string;
	category?:'cast' | 'crew';
	characterName?: string;
	lastUpdated: Date;
	created: Date;
}

// Utility
export interface CompanyRoleOpt {
	companyId: string;
	roleId?: string;
	time: Date;
	parentId: string;
	parentKind: Collection;
	user: string
}

export interface CompanyOpt {
	time: Date;
	user: string;
	companyId?: string
}