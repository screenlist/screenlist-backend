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

@Injectable()
export class PeopleService {
	constructor(
		private storage: StorageService,
		private db: DatabaseService
	){}

	async findAll(): Promise<Person[]>{
		const query =  this.db.createQuery('Person').order('name').limit(100);
		try {
			const [people] = await this.db.runQuery(query)
			return people
		} catch {
			throw new NotFoundException('Could not find people')
		}
	}

	async findOne(id: string): Promise<Person> {
		const personKey = this.db.key(['Person', +id]);
		try {
			const [person] = await this.db.get(personKey);
			return person
		} catch {
			throw new NotFoundException("Person not found")
		}
	}

	async createOne(data: CreatePersonDto, opt: PersonOpt){
		const {entity, history} = this.db.createPersonEntity(data, opt);
		try {
			await this.db.insert([entity, history]);
			return { 'status': 'successfully created', 'person_id': entity.key.id };
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async updateOne(data: UpdatePersonDto, opt: PersonOpt){
		const {entity, history} = this.db.updatePersonEntity(data, opt);
		try{
			await this.db.update(entity);
			await this.db.insert(history);
			return { 'status': 'successfully updated', 'person_id': entity.key.id };
		} catch(err: any){
			throw new BadRequestException(err.message);
		}
	}

	async deleteOne(opt: PersonOpt){
		const personKey = this.db.key(['{Person', +opt.personId]);
		const entities = [{key: personKey}]; // entites to be deleted
		const history = []; // actions to write into history
		const rolesQuery = this.db.createQuery('{PersonRole').hasAncestor(personKey);
		try {
			const [roles] = await this.db.runQuery(rolesQuery);
			const [person] = await this.db.get(personKey);
			const historyObj: HistoryOpt = {
				data: person,
				kind: 'Person',
				id: personKey.id,
				time: opt.time,
				action: 'delete',
				user: opt.user
			}
			history.push(this.db.formulateHistory(historyObj));
			roles.forEach((role) => {
				const roleKey = role[this.db.KEY];
				entities.push({key: roleKey});
				const roleHistoryObj: HistoryOpt = {
					data: role,
					kind: 'PersonRole',
					id: roleKey.id,
					time: opt.time,
					action: 'delete',
					user: opt.user
				}
				history.push(this.db.formulateHistory(roleHistoryObj));
			})
			await this.db.transaction().delete(entities);
			await this.db.transaction().insert(history);
			return { 'status': 'successfully deleted' };
		} catch(err:any) {
			throw new BadRequestException(err.message)
		}
	}

	async uploadPhoto(opt: PersonOpt, image: Express.Multer.File){
		try {
			const file = await this.storage.uploadProfilePhoto(image)
			const dto: UpdatePersonDto = {
				profilePhotoUrl: file.url,
				profilePhotoOriginalName: file.originalName
			}
			const {entity, history} = this.db.updatePersonEntity(dto, opt);
			await this.db.update(entity);
			await this.db.insert(history);
			return { 'status': 'created', 'image_url': entity.data.profilePhotoUrl }
		} catch {
			throw new BadRequestException()
		}
	}

	async removePhoto(opt: PersonOpt){
		try{
			const personKey = this.db.key(['Company', +opt.personId]);
			const [result] = await this.db.get(personKey);
			const person: Person = result 
			const dto: UpdatePersonDto = {
				profilePhotoUrl: null,
				profilePhotoOriginalName: null
			}
			const {entity, history} = this.db.updatePersonEntity(dto, opt);
			await this.storage.deletePoster(person.profilePhotoOriginalName);
			await this.db.update(entity);
			await this.db.insert(history);
			return {'status': 'deleted'}
		} catch {
			throw new BadRequestException()
		}
	}

	async createOneRole(data: CreatePersonRoleDto, opt: PersonRoleOpt){
		const {entity, history} = this.db.createPersonRoleEntity(data, opt);
		if(!data.category){
			throw new BadRequestException('role category not specified')
		}
		try {
			await this.db.insert([entity, history]);
			return { 'status': 'successfully created', 'role_id': entity.key.id }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async updateOneRole(data: UpdatePersonRoleDto, opt: PersonRoleOpt){
		const {entity, history} = await this.db.updatePersonRoleEntity(data, opt);
		try {
			await this.db.update(entity)
			await this.db.insert(history)
			return { 'status': 'successfully updated', 'role_id': entity.key.id }
		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}

	async deleteOneRole(opt: PersonRoleOpt){
		const roleKey = this.db.key(['Person', +opt.personId, opt.parentKind, +opt.parentId, 'CompanyRole', +opt.roleId]);
		try {
			const [role] = await this.db.get(roleKey);
			const historyObj: HistoryOpt = {
				data: role,
				kind: 'PersonRole',
				id: roleKey.id,
				time: opt.time,
				action: 'delete',
				user: opt.user
			}
			const history = this.db.formulateHistory(historyObj);
			const entity = {key: roleKey};
			await this.db.delete(entity);
			await this.db.insert(history);
			return { 'status': 'successfully deleted' };
		} catch (err: any){
			throw new BadRequestException(err.message)
		}
	}
}
