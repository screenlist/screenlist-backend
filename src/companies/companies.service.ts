import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
	CreateCompanyRoleDto,
	UpdateCompanyRoleDto,
	CreateCompanyDto,
	UpdateCompanyDto
} from './companies.dto';
import {
	Company,
	CompanyOpt,
	CompanyRoleOpt,
	Role
} from './companies.types';
import { PhotoDto } from '../films/films.dto';
import { Film, ImageOpt, Photo } from  '../films/films.types';
import { CollectionFields, EditsMetadata, HistoryOpt, HistoryX } from '../database/database.types';
import { StorageService } from '../storage/storage.service';
import { SearchService } from 'src/search/search.service';
import { CompanySchema} from 'src/search/search.types';
import { UserExt } from 'src/users/users.types';

@Injectable()
export class CompaniesService {
	constructor(
		private storage: StorageService,
		private mongo: DatabaseService,
		private search: SearchService
	){}

	async findAll(page?: number, limit?: number){
		const	size = limit ? +limit : 50
		const skip = ( (page ? +page : 1) - 1 ) * size

		let query = this.mongo.db.collection<Company>('companies').find({
			editVerified: true,
			isHidden: false
		}).sort({'lastUpdated': -1}).skip(skip).limit(size)

		try {
			const total = await this.mongo.db.collection<Company>('companies').countDocuments({
				editVerified: true,
				isHidden: false
			})
			const totalPages = Math.ceil(total/size)
			const companies = await query.toArray()

			const data = await Promise.all(
				companies.map(async (item) => {
					const photo = await this.mongo.db.collection<Photo>('photos').findOne({parentId: item.id, type: 'image' , photoIndex: 0, parentCollection: 'companies'})

					return {
						...item,
						photo: photo ? {
							url: this.mongo.replaceHost(photo.downsizedUrl),
							index: photo.photoIndex,
							credit: photo.attribution,
							altText: photo.description
						} : null
					}
				})
			);

			return {
				data: data,
				hasNextPage: page < totalPages,
				hasPrevPage: page > 1 
			}
		} catch(err: any) {
			throw new NotFoundException('Could not retrieve companies');
		}
	}

	async findAllUnverified() {
		try{
			let companies = await this.mongo.db.collection<Company>('companies').find({
				editVerified: false,
			}).sort({'lastUpdated': 1}).limit(50).toArray()

			return companies
		} catch {
			throw new NotFoundException('Could not retrieve companies');
		}
	}

	async findAllHidden() {
		try{
			let companies = await this.mongo.db.collection<Company>('companies').find({
				isHidden: true,
			}).sort({'lastUpdated': 1}).toArray()

			return companies
		} catch {
			throw new NotFoundException('Could not retrieve companies');
		}
	}

	async findOne(id: string, userId?: string) {

		try {
			const company = await this.mongo.db.collection<Company>('companies').findOne({ id: id })

			// Never permit the less privileged access hidden companies
			if(company.isHidden && userId){
				const userExt = await this.mongo.db.collection<UserExt>('users').findOne({id: userId})
				if(userExt.role === 'member' || userExt.role === 'journalist'){ throw new ForbiddenException('This resource is strictly restricted') }
			} else if(company.isHidden && !userId){ throw new ForbiddenException('This resource is strictly restricted') }

			const photo = await this.mongo.db.collection<Photo>('photos').findOne({parentCollection: 'companies', parentId: id, photoIndex: 0,  type: 'image'})
			const details = { 
				...company, 
				photo: photo ? {
					url: this.mongo.replaceHost(photo.optimisedUrl),
					index: photo.photoIndex,
					credit: photo.attribution,
					altText: photo.description
				} : null
			}

			const partialRoles = await this.mongo.db.collection<Role>('roles').find({parentId: id, parentCollection: 'companies'}).toArray()

			const roles = await Promise.all(
				partialRoles.map(async (item) => {
					try {

						const owner = await this.mongo.db.collection<Film>('films').findOne({id: item.ownerId})
						const poster = await this.mongo.db.collection<Photo>('photos').findOne({type: 'poster', parentId: item.ownerId, photoIndex: 0, parentCollection: 'films'})

						const path = `/${item.ownerCollection}/${item.ownerId}/companies/${item.parentId}/roles/${item.id}`;
						return {
							...item,
							ownerName: owner.name,
							posterUrl: this.mongo.replaceHost(poster?.downsizedUrl),
							year: owner.year,
							urlPath: path
						}
					} catch(err: any) {
						throw new BadRequestException(err.message)
					}
				})
			)

			const productions = []

			roles.sort((a, b) => b.year - a.year).forEach((item) => {
				const filmIndex = productions.findIndex((val) => val.ownerId === item.ownerId)
				const capacity = [{
					companyId: item.parentId,
					capacity: item.role,
					urlPath: item.urlPath,
					id: item.id
				}]
				// console.log(film)
				if(filmIndex !== -1){
					productions[filmIndex].roles.push(...capacity)
				} else {
					productions.push({
						...item,
						roles: capacity
					})
				}
			})

			// console.log(details)
			return {
				details,
				productions
			}
		} catch(err: any){
			throw new NotFoundException('Company not found')
		}
	}

	async findOneDetailsOnly(id: string){
		try {
			return this.mongo.db.collection<Company>('companies').findOne({id: id})
		} catch (err: any) {
			throw new NotFoundException()
		}
	}

	async createOne(data: CreateCompanyDto, opt: CompanyOpt){
		try {
			const company: Company = {
				id: await this.mongo.generateUniqueId('companies', 12),
				...data,
				created: opt.time,
				lastUpdated: opt.time,
				editVerified: false,
				lastVerified: opt.time,
				editLocked: false,
				isHidden: false
			}
			await this.mongo.insertOne(company, 'companies');

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'companies',
				id: company.id,
				action: 'create',
				time: opt.time,
			}
			await this.mongo.createHistory(historyObj);

			const searchRecord: CompanySchema = {
				id: company.id,
				name: company.name,
				founder: company.founder,
				director: company.director,
				founded: company.founded,
				description: company.description,
				country: company.country,
				city: company.city,
				created: this.mongo.dateToBigInt(company.created),
				lastUpdated: this.mongo.dateToBigInt(company.lastUpdated)
			}
			// await this.algolia.initIndex('companies').saveObject(searchRecord).wait();
			await this.search.client.collections('companies').documents().create(searchRecord);

			return company
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async updateOne(data: UpdateCompanyDto, opt: CompanyOpt, remove?: CollectionFields<Company>){
		if(!Array.isArray(remove)){ throw new BadRequestException('Provide an array for properties to remove') }

		try {
			const entity = await this.mongo.db.collection<Company>('companies').findOne({id: opt.companyId})
			const dataBefore = {...entity};

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			if(entity.editLocked === true){ throw new BadRequestException("Edit locked") }

			for (const key in data) {
				entity[key] = data[key]
			}

			entity.lastUpdated = opt.time
			entity.editVerified = false

			await this.mongo.updateOne(entity, 'companies', remove)
			
			const updated = await this.mongo.db.collection<Company>('companies').findOne({id: opt.companyId})

			const dataAfter = {...updated};
			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'companies',
				id: opt.companyId,
				action: 'update',
				time: opt.time,
			}
			await this.mongo.createHistory(historyObj);

			// If the name has been updated, update all its roles
			if(data.hasOwnProperty('name')){
				await this.mongo.db.collection<Role>('roles').updateMany({parentName: dataBefore.name, parentCollection: 'companies', parentId: updated.id}, {
					$set: { parentName: updated.name }
				})
			}

			const searchRecord: Partial<CompanySchema> = {
				name: updated.name,
				founder: updated.founder,
				director: updated.director,
				founded: updated.founded,
				description: updated.description,
				country: updated.country,
				city: updated.city,
				lastUpdated: this.mongo.dateToBigInt(updated.lastUpdated)
			}
			await this.search.client.collections('companies').documents(opt.companyId).update(searchRecord);

			if(entity.name !== updated.name){
				await this.mongo.db.collection<Role>('roles').updateMany({
					parentCollection: 'companies',
					parentId: updated.id
				}, { $set: { parentName: updated.name } })
			}

			return updated
		} catch(err: any){
			// console.log(err)
			throw new BadRequestException(err.message);
		}
	}

	async deleteOne(opt: CompanyOpt){
		try {
			const roles = await this.mongo.db.collection<Role>('roles').find({parentCollection: 'companies', parentId: opt.companyId}).toArray();
			const company = await this.mongo.db.collection<Company>('companies').findOne({id: opt.companyId})
			const historyObj: HistoryOpt = {
				dataObject: company,
				kind: 'companies',
				id: company.id,
				time: opt.time,
				action: 'delete',
				user: opt.user
			}
			await this.mongo.createHistory(historyObj);
			await Promise.all(
				roles.map(async (role) => {
					const roleHistoryObj: HistoryOpt = {
						dataObject: role,
						kind: 'roles',
						id: role.id,
						time: opt.time,
						action: 'delete',
						user: opt.user,
						pId: opt.companyId,
						pKind: 'companies'
					}
					await this.mongo.createHistory(roleHistoryObj);
				})
			)
			
			await this.search.client.collections('companies').documents(company.id).delete();
			await this.mongo.db.collection<Role>('roles').deleteMany({parentCollection: 'companies', parentId: opt.companyId});
			await this.mongo.db.collection<Company>('companies').deleteOne({id: opt.companyId});
			return { 'status': 'deleted' };
		} catch(err:any) {
			throw new BadRequestException(err.message)
		}
	}

	async uploadPhoto(opt: ImageOpt, image: Express.Multer.File){
		try {
			if(opt.index !== 0){ throw new BadRequestException('Unknown index') }

			const existing = await this.mongo.db.collection<Photo>('photos').countDocuments({parentCollection: 'companies', parentId: opt.parentId, type: 'image', photoIndex: opt.index})
			if(existing > 0) {
				throw new BadRequestException("Too many photos for a single resource");
			}

			const data = await this.storage.uploadCompanyLogo(image)
			const photo: Photo = { 
				...data, 
				id: await this.mongo.generateUniqueId('photos', 12),
				type: 'image',
				uploadedByUser: opt.user,
				photoIndex: opt.index,
				parentId: opt.parentId,
				parentCollection: 'companies',
				created: opt.time,
				lastUpdated: opt.time
			}
			
			await this.mongo.insertOne(photo, 'photos')

			// Alert data change to the parent entity
			await this.mongo.updateOne({
				id: opt.parentId,
				editVerified: false,
				lastUpdated: opt.time
			}, 'companies');

			const historyObj: HistoryOpt = {
				dataObject: photo,
				user: opt.user,
				kind: 'photos',
				id: photo.id,
				action: 'create',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			const history = await this.mongo.createHistory(historyObj);

			const searchRecord: Partial<CompanySchema> = {
				photoUrl: data.downsizedUrl
			}
			// await this.algolia.initIndex('companies').partialUpdateObject(searchRecord).wait();
			await this.search.client.collections('companies').documents(opt.parentId).update(searchRecord);

			return photo
		} catch(err: any) {
			throw new BadRequestException()
		}
	}

	async updatePhoto(data: PhotoDto , opt: ImageOpt){
		try {
			const entity = await this.mongo.db.collection<Photo>('photos').findOne({
				parentCollection: 'companies',
				parentId: opt.parentId,
				photoIndex: opt.index,
				type: 'image'
			})
			const dataBefore = {...entity};

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			for (const key in data) {
				entity[key] = data[key]
			}

			entity.lastUpdated = opt.time

			const dataAfter = {...entity};
			await this.mongo.updateOne(entity, 'photos');

			// Alert data change to the parent entity
			await this.mongo.updateOne({
				id: opt.parentId,
				editVerified: false,
				lastUpdated: opt.time
			}, 'companies');

			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'photos',
				id: entity.id,
				action: 'update',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			await this.mongo.createHistory(historyObj);
			return entity
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async removePhoto(opt: ImageOpt){
		try{
			const photo = await this.mongo.db.collection<Photo>('photos').findOne({
				parentCollection: 'companies',
				parentId: opt.parentId,
				photoIndex: opt.index,
				type: 'image'
			})
			const historyObj: HistoryOpt = {
				dataObject: photo,
				user: opt.user,
				kind: 'photos',
				id: photo.id,
				action: 'delete',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			await this.storage.deletePhoto(photo.originalName);
			await this.storage.deletePhoto(photo.optimisedName);
			await this.storage.deletePhoto(photo.downsizedName);
			await this.mongo.createHistory(historyObj);
			await this.mongo.db.collection<Photo>('photos').deleteOne({
				parentCollection: 'companies',
				parentId: opt.parentId,
				photoIndex: opt.index,
				type: 'image'
			});

			await this.mongo.updateOne({
				id: opt.parentId,
				editVerified: false
			}, 'companies');

			const searchRecord: Partial<CompanySchema> = {
				photoUrl: null
			}
			await this.search.client.collections('companies').documents(opt.parentId).update(searchRecord);

			return {'status': 'deleted'}
		} catch {
			throw new BadRequestException()
		}
	}

	async createOneRole(data: CreateCompanyRoleDto, opt: CompanyRoleOpt){
		if(!data.capacity){
			throw new BadRequestException('role capacity not specified')
		}

		try {
			const film = await this.mongo.db.collection<Film>('films').findOne({id: opt.parentId})

			const role: Role = {
				id: await this.mongo.generateUniqueId('roles', 12),
				parentCollection: 'companies',
				parentId: opt.companyId,
				parentName: data.companyName,
				ownerCollection: 'films',
				ownerId: opt.parentId,
				ownerName: film.name,
				role: data.capacity,
				lastUpdated: opt.time,
				created: opt.time
			}
			await this.mongo.insertOne(role, 'roles')

			film.editVerified = false
			film.lastUpdated = opt.time
			await this.mongo.updateOne(film, 'films')

			// Create history
			const historyObj: HistoryOpt = {
				dataObject: role,
				user: opt.user,
				kind: 'roles',
				id: role.id,
				action: 'create',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			await this.mongo.createHistory(historyObj);

			return role
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async updateOneRole(data: UpdateCompanyRoleDto, opt: CompanyRoleOpt){
		try {
			const entity = await this.mongo.db.collection<Role>('roles').findOne({id: opt.roleId})
			const dataBefore = {...entity};

			if(!entity){
				throw new BadRequestException("Action not allowed");
			}

			for (const key in data) {
				entity[key] = data[key]
			}

			entity.lastUpdated = opt.time

			const dataAfter = {...entity};
			await this.mongo.updateOne(entity, 'roles');

			// Alert data change to the parent entity
			await this.mongo.updateOne({
				id: opt.parentId,
				editVerified: false,
				lastUpdated: opt.time
			}, 'films');


			// Creates history
			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'roles',
				id: entity.id,
				action: 'update',
				time: opt.time,
				pId: opt.parentId,
				pKind: opt.parentKind
			}
			await this.mongo.createHistory(historyObj);

			return entity
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async deleteOneRole(opt: CompanyRoleOpt){

		try {
			const role = await this.mongo.db.collection<Role>('roles').findOne({id: opt.roleId})
			const historyObj: HistoryOpt = {
				dataObject: role,
				kind: 'roles',
				id: role.id,
				time: opt.time,
				action: 'delete',
				user: opt.user,
				pKind: opt.parentKind,
				pId: opt.parentId
			}

			await this.mongo.db.collection<Role>('roles').deleteOne({id: opt.roleId});
			await this.mongo.createHistory(historyObj);
			
			await this.mongo.updateOne({
				id: opt.parentId,
				editVerified: false,
				lastUpdated: opt.time
			}, 'films');
			
			return { 'status': 'deleted' };
		} catch (err: any){
			throw new BadRequestException(err.message);
		}
	}

	// Settings methods
	async verifyEdit(id: string, userId: string){

		try {
			const history = await this.justHistory(id)
			const reputations = this.mongo.determineUserReputation(history);
			const company = await this.mongo.db.collection<Company>('companies').findOne({ id: id })

			await Promise.all(
				reputations.map(async score => {
					try {
						const user = await this.mongo.db.collection<UserExt>('users').findOne({id: score[0]})
						user.reputation += score[1]
						await this.mongo.updateOne(user, 'users')
					} catch (err: any){}
				})
			)

			const timeNow = new Date();
			const previousVerificationDate = company.lastVerified

			company.editVerified = true
			company.lastVerified = timeNow

			await this.mongo.updateOne(company, 'companies')

			const edit: EditsMetadata = {
				id: await this.mongo.generateUniqueId('edits', 16),
				user: userId,
				intervalBegins: previousVerificationDate,
				intervalEnds: timeNow,
				pageId: company.id,
				pageType: 'companies',
				reputations: reputations
			}

			await this.mongo.insertOne(edit, 'edits')

			return {status: 'success'};
		} catch (err: any){
			// console.log(err)
			throw new BadRequestException(err.message);
		}
	}

	async hideCompany(id: string){
		try {
			await this.mongo.updateOne({
				id: id,
				isHidden: true
			}, 'companies')

			await this.search.client.collections('companies').documents(id).delete()

			return {status: 'success'};
		} catch(err: any){
			throw new BadRequestException()
		}
	}

	async unhideCompany(id: string){
		try {
			await this.mongo.updateOne({
				id: id,
				isHidden: false
			}, 'companies')

			const company = await this.mongo.db.collection<Company>('companies').findOne({ id: id })

			const searchRecord: CompanySchema = {
				id: company.id,
				name: company.name,
				founder: company.founder,
				director: company.director,
				founded: company.founded,
				description: company.description,
				country: company.country,
				city: company.city,
				created: this.mongo.dateToBigInt(company.created),
				lastUpdated: this.mongo.dateToBigInt(company.lastUpdated)
			}

			const photo = await this.mongo.db.collection<Photo>('photos').findOne({parentCollection: 'companies', parentId: id, photoIndex: 0,  type: 'image'})

			if(photo){ searchRecord.photoUrl = photo.downsizedUrl }

			await this.search.client.collections('companies').documents().create(searchRecord);

			return {status: 'success'};
		} catch(err: any){
			throw new BadRequestException()
		}
	}

	async lockCompanyEdit(id: string){
		try {
			await this.mongo.updateOne({
				id: id,
				editLocked: true
			}, 'companies')
			return {status: 'success'};
		} catch(err: any){
			throw new BadRequestException()
		}
	}

	async unlockCompanyEdit(id: string){
		try {
			await this.mongo.updateOne({
				id: id,
				editLocked: false
			}, 'companies')
			return {status: 'success'};
		} catch(err: any){
			throw new BadRequestException()
		}
	}

	// History
	async justHistory(companyId: string, intervalBegins?: Date, intervalEnds?: Date){
		try {
			const company = await this.mongo.db.collection<Company>('companies').findOne({id: companyId})
			const lastestMod = company.hasOwnProperty('lastVerified') ? new Date(company.lastVerified) : new Date(company.created)

			const begins: Date = intervalBegins ? intervalBegins : lastestMod
			const ends: Date = intervalBegins ? intervalEnds : new Date()

			const companyHistory = await this.mongo.db.collection<HistoryX>('history').find({
				xKind: 'companies',
				xIdentifier: companyId,
				xTimestamp: {$gte: begins, $lte: ends}
			}).sort({xTimestamp: -1}).toArray();

			const photoHistory = await this.mongo.db.collection<HistoryX>('history').find({
				xKind: 'photos',
				wKind: 'companies',
				wIdentifier: companyId,
				xTimestamp: {$gte: begins, $lte: ends} 
			}).sort({xTimestamp: -1}).toArray();

			const allHistories = [
				...companyHistory, 
				...photoHistory
			];

			return allHistories
		} catch (err: any) {
			throw new NotFoundException(err.message)
		}
	}

	async intervalHistory(verificationId: string){
		try {
			const metadata = await this.mongo.db.collection<EditsMetadata>('edits').findOne({id: verificationId})
			const history = await this.justHistory(metadata.pageId, metadata.intervalBegins, metadata.intervalEnds)
			const sortedHistory = await this.mongo.decodeHistory(history)
			return sortedHistory
		} catch(err: any){
			throw new NotFoundException(err.message)
		}
	}

	async getSnapShots(filmId: string){
		try {
			return await this.mongo.db.collection<EditsMetadata>('edits').find({pageId: filmId, pageType: 'companies'}).limit(100).toArray()
		} catch(err: any){
			throw new NotFoundException(err.message)
		}
	}

	async findHistory(companyId: string){
		try {
			const history = await this.justHistory(companyId);

			const sortedHistory = await this.mongo.decodeHistory(history);
			 // console.log('Sorted history', sortedHistory)
			return sortedHistory;
		} catch (err: any) {
			throw new NotFoundException(err.message)
		}
	}
}