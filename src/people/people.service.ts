import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
	CreatePersonDto,
	UpdatePersonDto,
	CreatePersonRoleDto,
	UpdatePersonRoleDto
} from './people.dto';
import {
	Person,
	PersonRole,
	PersonOpt,
	PersonRoleOpt
} from './people.types';
import { HistoryOpt } from '../database/database.types';
import { StorageService } from '../storage/storage.service';
import { CreateDisplayPhotoDto, UpdateDisplayPhotoDto } from '../films/films.dto';
import { ImageOpt } from  '../films/films.types';

@Injectable()
export class PeopleService {
	constructor(
		private storage: StorageService,
		private db: DatabaseService
	){}

	async findAll(): Promise<Person[]>{
		const query =  this.db.createQuery('Person').order('name').limit(100);
		try {
			let [people] = await this.db.runQuery(query);
			people = await Promise.all(
				people.map(async (item) => {
					const photoKey = this.db.key(['Person', +item[this.db.KEY]['id'], 'PersonPhoto', '0']);
					const [photo] = await this.db.get(photoKey);
					item.id = item[this.db.KEY]['id'];
					item.photo = photo ? {
						url: photo?.sdUrl,
						id: photo[this.db.KEY]['name'],
						credit: photo?.attribution,
						altText: photo?.description
					} : null

					return item
				})
			)
			return people
		} catch {
			throw new NotFoundException('Could not find people')
		}
	}

	async findOne(id: string) {
		const personKey = this.db.key(['Person', +id]);
		const photoKey = this.db.key(['Person', +id, 'PersonPhoto', '0'])
		const rolesQuery = this.db.createQuery('PersonRole').filter('personId', '=', id)
		try {
			const [person] = await this.db.get(personKey);
			const [photo] = await this.db.get(photoKey);
			let [roles] = await this.db.runQuery(rolesQuery);
			const filmography = [];

			person.photo = photo ? {
				url: photo?.sdUrl,
				id: photo[this.db.KEY]['name'],
				credit: photo?.attribution,
				altText: photo?.description
			} : null;

			roles = await Promise.all(
				roles.map(async (item: CreatePersonRoleDto) => {
					const parentKey = this.db.key([item.ownerKind, +item.ownerId])
					const posterKey = this.db.key([item.ownerKind, +item.ownerId, 'Poster', '0'])
					try {
						const [parent] = await this.db.get(parentKey);
						const [poster] = await this.db.get(posterKey);
						const path = `/${item.ownerKind == 'Film' ? 'films' : 'series'}/${item.ownerId}/people/${item.personId}/roles/${item[this.db.KEY]['id']}`;

						const role = {...item, id: item[this.db.KEY]['id'], urlPath: path}
						
						const work = filmography.find((element) => element.id == item.ownerId);

						if(work){
							work.roles.push(role)
						} else {
							const parentObject = {
								name: parent.name,
								id: item.ownerId,
								type: item.ownerKind,
								year: parent.year,
								posterUrl: poster?.lqUrl,
								roles: [role]
							}
							filmography.push(parentObject)
						}

						return {
							id: item[this.db.KEY]['id'],
							...item,
							ownerName: parent.name,
							posterUrl: poster?.lqUrl,
							year: parent.year
						}
					} catch (err: any) {
						throw new BadRequestException(err.message)
					}
				})
			)

			filmography.sort((a, b) => {
				if(a.year > b.year) {
					return -1
				} else {
					return 0
				}
			});

			return {
				details : {
					...person, 
					id: person[this.db.KEY]['id']
				},
				filmography
			}
		} catch {
			throw new NotFoundException("Person not found")
		}
	}

	async createOne(data: CreatePersonDto, opt: PersonOpt){
		try {
			const {entity, history} = await this.db.createPersonEntity(data, opt);
			return { id: entity.key.id, ...entity.data };
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async updateOne(data: UpdatePersonDto, opt: PersonOpt){
		try {
			const {entity, history} = await this.db.updatePersonEntity(data, opt);
			return { id: entity[this.db.KEY]['id'], ...entity };
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async deleteOne(opt: PersonOpt){
		const personKey = this.db.key(['{Person', +opt.personId]);
		const entities = [{key: personKey}]; // entites to be deleted
		const rolesQuery = this.db.createQuery('{PersonRole').hasAncestor(personKey);
		try {
			const [roles] = await this.db.runQuery(rolesQuery);
			const [person] = await this.db.get(personKey);
			const historyObj: HistoryOpt = {
				dataObject: person,
				kind: 'Person',
				id: personKey.id,
				time: opt.time,
				action: 'delete',
				user: opt.user
			}
			await this.db.createHistory(historyObj);
			roles.forEach(async (role) => {
				const roleKey = role[this.db.KEY];
				entities.push({key: roleKey});
				const roleHistoryObj: HistoryOpt = {
					dataObject: role,
					kind: 'PersonRole',
					id: roleKey.id,
					time: opt.time,
					action: 'delete',
					user: opt.user
				}
				await this.db.createHistory(roleHistoryObj);
			})
			await this.db.algolia.initIndex('people').deleteObject(personKey.id)
			await this.db.transaction().delete(entities);
			return { 'status': 'successfully deleted' };
		} catch(err:any) {
			throw new BadRequestException(err.message)
		}
	}

	async uploadPhoto(opt: ImageOpt, image: Express.Multer.File){
		try {
			const data = await this.storage.uploadProfilePhoto(image)
			const dto: CreateDisplayPhotoDto = { ...data }
			const {entity, history} = await this.db.createPersonPhotoEntity(dto, opt);
			return { id: entity.key.name, ...entity.data }
		} catch {
			throw new BadRequestException()
		}
	}

	async updatePhoto(data: UpdateDisplayPhotoDto , opt: ImageOpt){
		try {
			const {entity, history} = await this.db.updatePersonPhotoEntity(data, opt);
			return { id: entity[this.db.KEY]['id'], ...entity }
		} catch {
			throw new BadRequestException()
		}
	}

	async removePhoto(opt: ImageOpt){
		try{
			const photoKey = this.db.key([opt.parentKind, +opt.parentId, 'PersonPhoto', opt.imageId]);
			const [photo] = await this.db.get(photoKey);
			const historyObj: HistoryOpt = {
				dataObject: photo,
				user: opt.user,
				kind: 'PersonPhoto',
				id: photoKey.id,
				action: 'delete',
				time: opt.time,
			}
			await this.storage.deleteProfilePhoto(photo.originalName);
			await this.storage.deleteProfilePhoto(photo.hdName);
			await this.storage.deleteProfilePhoto(photo.sdName);
			await this.db.createHistory(historyObj);
			await this.db.delete(photoKey)
			return {'status': 'deleted'}
		} catch(err: any) {
			throw new BadRequestException(err.message)
		}
	}

	async createOneRole(data: CreatePersonRoleDto, opt: PersonRoleOpt){
		if(!data.category){
			throw new BadRequestException('role category not specified')
		}
		try {
			const {entity, history} = await this.db.createPersonRoleEntity(data, opt);
			return { 'status': 'successfully created', 'role_id': entity.key.id }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async updateOneRole(data: UpdatePersonRoleDto, opt: PersonRoleOpt){
		try {
			const {entity, history} = await this.db.updatePersonRoleEntity(data, opt);
			return { 'status': 'successfully updated', 'role_id': entity[this.db.KEY]['id'] }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async deleteOneRole(opt: PersonRoleOpt){
		const roleKey = this.db.key(['Person', +opt.personId, opt.parentKind, +opt.parentId, 'CompanyRole', +opt.roleId]);
		try {
			const [role] = await this.db.get(roleKey);
			const historyObj: HistoryOpt = {
				dataObject: role,
				kind: 'PersonRole',
				id: roleKey.id,
				time: opt.time,
				action: 'delete',
				user: opt.user
			}
			await this.db.createHistory(historyObj);
			const entity = {key: roleKey};
			await this.db.delete(entity);
			return { 'status': 'successfully deleted' };
		} catch (err: any){
			throw new BadRequestException(err.message)
		}
	}
}
