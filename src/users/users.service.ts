import {
	Injectable,
	BadRequestException,
	NotFoundException,
	ForbiddenException
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { DatabaseService } from '../database/database.service';
import {
	UserOpt,
	UserExt,
	Request,
	RequestOpt,
	UserRoles,
} from './users.types';
import {
	UpdateUserDto,
	CreateRequestDto,
} from '../users/users.dto';
import { CollectionFields, HistoryOpt, HistoryX } from '../database/database.types';
import { Film, Photo, Rating } from '../films/films.types';
import { ConfigService } from '@nestjs/config';
import { SearchService } from 'src/search/search.service';
import fetch from 'cross-fetch';
import { Company } from 'src/companies/companies.types';
import { WebhookEvent } from '@clerk/express';
import { UserSchema } from 'src/search/search.types';

@Injectable()
export class UsersService {
	constructor(
		private auth: AuthService,
		private mongo: DatabaseService,
		private config: ConfigService,
		private search: SearchService
	) {}

	/** GENERAL USER METHODS **/

	async bestowPriviledgedRole(role: UserRoles, uid: string) {
		try {
			const user = await this.mongo.db.collection<UserExt>('users').findOne({id: uid})
			if (user.role === 'admin') {
				throw new ForbiddenException();
			}

			await this.mongo.updateOne({
				id: user.id,
				role: role,
				lastUpdated: new Date()
			}, 'users')

			return {'status': 'success'}
		} catch {
			throw new BadRequestException();
		}
	}

	async revokePrivilegedRole(uid: string) {
		try {
			const user = await this.mongo.db.collection<UserExt>('users').findOne({id: uid})
			if (user && user.role === 'admin') {
				throw new ForbiddenException();
			}

			await this.mongo.updateOne({
				id: uid,
				role: 'member',
				lastUpdated: new Date()
			}, 'users')

			return {'status': 'success'}
		} catch {
			throw new BadRequestException();
		}
	}

	async createUser(id: string, role: UserRoles){
		const time = new Date()
		try {
			const user = await this.auth.client.clerkClient.users.getUser(id)
			const extendedUser: UserExt = {
				id: user.id,
				username: user.username,
				fullName: `${user.firstName} ${user.lastName}`,
				role: role,
				reputation: 0,
				favouriteFilms: [],
				created:time,
				lastUpdated: time,
			}

			if(user.hasImage){
				extendedUser.photoUrl = user.imageUrl
			}

			await this.mongo.insertOne(extendedUser, 'users')

			const searchRecord: UserSchema = {
				id: extendedUser.id,
				username: extendedUser.username,
				fullName: user.firstName+' '+user.lastName,
				role: extendedUser.role,
				reputation: extendedUser.reputation,
				publication: extendedUser.publication,
				criticScore: extendedUser.criticScore,
				created: this.mongo.dateToBigInt(extendedUser.created),
				lastUpdated: this.mongo.dateToBigInt(extendedUser.lastUpdated)
			}

			if(user.hasImage){
				searchRecord.photoUrl = user.imageUrl
			}

			await this.search.client.collections('users').documents().create(searchRecord);

			return extendedUser
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async updateUser(data: UpdateUserDto, opt: UserOpt, remove?: CollectionFields<UserExt>) {
		const allowed = ['favouriteFilms', 'bio', 'publication']
		try {
			const entity = await this.mongo.db.collection<UserExt>('users').findOne({id: opt.user})
			
			if(!entity) {
				throw new BadRequestException("Action not allowed")
			}

			if(entity.username !== opt.userName){ throw new ForbiddenException("Action not allowed") }

			const user = await this.auth.client.clerkClient.users.getUser(entity.id)

			// Modify existing data
			for (const key in data) {
				entity[key] = data[key]
			}

			if(user.hasImage){ entity.photoUrl = user.imageUrl }

			entity.lastUpdated = new Date()

			const unsetter = remove ? remove.filter(item => allowed.includes(item)) : []
			await this.mongo.updateOne(entity, 'users', unsetter)
			const updated = await this.mongo.db.collection<UserExt>('users').findOne({id: opt.user})
			
			const searchRecord: Partial<UserSchema> = {
				username: updated.username,
				fullName: user.firstName+' '+user.lastName,
				role: updated.role,
				reputation: updated.reputation,
				publication: updated.publication,
				criticScore: updated.criticScore,
				lastUpdated: this.mongo.dateToBigInt(updated.lastUpdated)
			}
			if(user.hasImage){ searchRecord.photoUrl = user.imageUrl }
			await this.search.client.collections('users').documents(user.id).update(searchRecord);

			return updated
		} catch(err: any) {
			throw new BadRequestException(err.message);
		}
	}

	async findAllUsers(page?: number, limit?: number) {
		const	size = limit ? +limit : 50
		const skip = ( (page ? +page : 1) - 1 ) * size
		const query = this.mongo.db.collection<UserExt>('users').find({}).sort({username: 1}).skip(skip).limit(size)
		try {
			return {
				data: query.toArray(),
				hasNextPage: query.toArray()
			}
		} catch (err) {
			throw new NotFoundException(err.message);
		}
	}

	async findUserByUsername(username: string) {
		try {
			const user = await this.mongo.db.collection<UserExt>('users').findOne({username: username})

			// Extensive Creation History
			const filmsHistory = await this.mongo.db.collection<HistoryX>('history').find({
				xUser: user.id,
				xKind: 'films',
				xAction: 'create'
			}).sort({xTimestamp: -1}).limit(34).toArray();

			const companiesHistory = await this.mongo.db.collection<HistoryX>('history').find({
				xUser: user.id,
				xKind: 'companies',
				xAction: 'create'
			}).sort({xTimestamp: -1}).limit(33).toArray();

			const peopleHistory = await this.mongo.db.collection<HistoryX>('history').find({
				xUser: user.id,
				xKind: 'people',
				xAction: 'create'
			}).sort({xTimestamp: -1}).limit(34).toArray();
			

			const films = await Promise.all(
				filmsHistory.map(async (item) => {
					try {
						const film = await this.mongo.db.collection<Film>('films').findOne({id: item.xIdentifier})
						const poster = await this.mongo.db.collection<Photo>('photos').findOne({
							parentCollection: 'films',
							parentId: item.xIdentifier,
							type: 'poster',
							photoIndex: 0
						})
						
						return {
							...film,
							poster: poster
							? {
									url: poster.optimisedUrl,
									id: poster.id,
									credit: poster.attribution,
									altText: poster.description,
								}
							: null
						};
					} catch (err) {
						throw new NotFoundException(err);
					}
				}),
			);

			const companies = await Promise.all(
				companiesHistory.map(async (item) => {
					try {
						const company = await this.mongo.db.collection<Company>('companies').findOne({id: item.xIdentifier})
						const photo = await this.mongo.db.collection<Photo>('photos').findOne({
							parentCollection: 'companies',
							parentId: item.xIdentifier,
							type: 'image',
							photoIndex: 0
						})

						return {
							...company,
							photo: photo
							? {
									url: photo.optimisedUrl,
									id: photo.id,
									credit: photo.attribution,
									altText: photo.description,
								}
							: null
						};
					} catch (err) {
						throw new NotFoundException(err);
					}
				}),
			);

			const people = await Promise.all(
				peopleHistory.map(async (item) => {
					try {
						const person = await this.mongo.db.collection<Company>('people').findOne({id: item.xIdentifier})
						const photo = await this.mongo.db.collection<Photo>('photos').findOne({
							parentCollection: 'people',
							parentId: item.xIdentifier,
							type: 'image',
							photoIndex: 0
						})

						return {
							...person,
							photo: photo
							? {
									url: photo.optimisedUrl,
									id: photo.id,
									credit: photo.attribution,
									altText: photo.description,
								}
							: null
						};
					} catch (err) {
						throw new NotFoundException(err);
					}
				}),
			);
			
			const reviews = await this.mongo.db.collection<Rating>('ratings').find({
				authorUid: user.id
			}).sort({created: -1}).toArray();

			return {
				details: user,
				films: films,
				companies: companies,
				people: people,
				reviews: reviews,
			};
		} catch (err: any) {
			// console.log(err);
			throw new NotFoundException();
		}
	}

	async findDetailsOnly(userId: string){
		try {
			return await this.mongo.db.collection<UserExt>('users').findOne({id: userId})
		} catch(err: any){
			throw new NotFoundException()
		}
	}

	async getMemberQuotaUsage(userId: string){
		try {
			const user = await this.mongo.db.collection<UserExt>('users').findOne({id: userId})

			if(user.role === 'member'){
				const usage = await this.mongo.get24HourEdits(userId)
				const rate = Math.round( (usage/15)*100 )
				const exceeded = 15 - usage <= 0
				return {
					capped: true,
					usage: rate,
					reached: exceeded
				}
			} else {
				return {
					capped: false,
					usage: 0,
					reached: false
				}
			}
			
		} catch(err: any){
			throw new NotFoundException()
		}
	}

	// Journalist methods
	async findAllJournalists() {
		const aYearAgo = new Date(
			Number(new Date()) - 1000 * 60 * 60 * 24 * 30 * 12,
		);
		try {
			const journalists = await this.mongo.db.collection<UserExt>('users').find({role: 'journalist'}).sort({username: 1}).toArray()

			const result = await Promise.all(
				journalists.map(async (item) => {
					try {
						const allTime = await this.mongo.db.collection<Rating>('ratings').countDocuments({
							authorUid: item.id
						})
						const recent = await this.mongo.db.collection<Rating>('ratings').countDocuments({
							authorUid: item.id,
							created: {$gt: aYearAgo}
						})
						const user = await this.auth.client.clerkClient.users.getUser(item.id)
						return {
							...item,
							reviewsAllTime: allTime,
							reviewsPastYear: recent,
							author: `${user.firstName} ${user.lastName}`
						};
					} catch (err: any) {
						throw new NotFoundException(err.message);
					}
				}),
			);

			return result;
		} catch {
			throw new BadRequestException('Could not retrieve users');
		}
	}

	async applyForJournalistRole(data: CreateRequestDto, opt: RequestOpt) {
		const threeMonthsAgo = new Date(
			Number(opt.time) - 1000 * 60 * 60 * 24 * 30 * 3,
		);
		try {
			const recentRequests = await this.mongo.db.collection<Request>('requests').countDocuments({
				createdBy: opt.user,
				request: 'makeJournalist',
				created: {$gt: threeMonthsAgo}
			})

			if (recentRequests > 0) {
				throw new BadRequestException(
					'Wait three months from your last attempt and try again',
				);
			}

			const request: Request = {
				id: await this.mongo.generateUniqueId('requests', 12),
				request: 'makeJournalist',
				requestSubject: opt.user,
				notes: data.notes,
				approved: false,
				acknowledged: false,
				createdBy: opt.user,
				created: opt.time,
				lastUpdated: opt.time
			}
			await this.mongo.insertOne(request, 'requests');

			const historyObj: HistoryOpt = {
				dataObject: data,
				user: opt.user,
				kind: 'requests',
				id: request.id,
				action: 'create',
				time: opt.time,
			}
			await this.mongo.createHistory(historyObj);

			return request
		} catch (err: any) {
			throw new BadRequestException('action failed');
		}
	}

	async approveToSetJournalist(opt: RequestOpt) {

		try {
			const request = await this.mongo.db.collection<Request>('requests').findOne({id: opt.requestId})
			const dataBefore = {...request};
			request.approved = true			
			request.acknowledged = true
			const dataAfter = {...request};
			await this.mongo.updateOne(request, 'requests')

			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'requests',
				id: request.id,
				action: 'update',
				time: opt.time,
			}
			await this.mongo.createHistory(historyObj);

			// await this.bestowPriviledgedRole('journalist', request.requestSubject)
			await this.mongo.updateOne({
				id: request.requestSubject,
				role: 'journalist',
				criticScore: 0
			}, 'users')

			const user = await this.auth.client.clerkClient.users.getUser(request.requestSubject)

			await fetch('https://api.brevo.com/v3/smtp/email', {
				method: 'POST',
				headers: {
					accept: 'application/json',
					'content-type': 'application/json',
					'api-key': this.config.get('BREVO_KEY'),
				},
				body: JSON.stringify({
					sender: {
						name: 'Support from Screen List',
						email: 'support@mail.screenlist.co.za',
					},
					to: [{ email: this.auth.getUserEmail(user) }],
					templateId: 1,
					replyTo: {
						email: 'screenlist@marginal.co.za',
						name: 'Support from Screen List',
					},
				}),
			});

			return request
		} catch (err: any) {
			throw new BadRequestException('action failed');
		}
	}

	async rejectToSetJournalist(opt: RequestOpt) {
		try {
			const request = await this.mongo.db.collection<Request>('requests').findOne({id: opt.requestId})
			const dataBefore = {...request};
			request.approved = false	
			request.acknowledged = true		
			const dataAfter = {...request};
			await this.mongo.updateOne(request, 'requests')

			const historyObj: HistoryOpt = {
				dataObject: dataAfter,
				prevDataObject: dataBefore,
				user: opt.user,
				kind: 'requests',
				id: request.id,
				action: 'update',
				time: opt.time,
			}
			await this.mongo.createHistory(historyObj);
			return request
		} catch (err: any) {
			throw new BadRequestException();
		}
	}

	async findAllJournalistRequests() {
		try {
			const requests = await this.mongo.db.collection<Request>('requests').find({
				request: 'makeJournalist',
				approved: false,
				acknowledged: false
			}).toArray()

			const results = await Promise.all(
				requests.map(async (request) => {
					const user = await this.auth.client.clerkClient.users.getUser(request.requestSubject)
					const userExtended = await this.mongo.db.collection<UserExt>('users').findOne({id: request.requestSubject})
					
					return {
						...request,
						username: user.username,
						displayName: `${user.firstName} ${user.lastName}`,
						publication: userExtended.publication
					}
				})
			);

			return results;
		} catch(err: any) {
			throw new NotFoundException();
		}
	}

	async findOneJournalistRequest(id: string) {
		try {
			return await this.mongo.db.collection<Request>('requests').findOne({id: id})
		} catch {
			throw new NotFoundException();
		}
	}

	// Admin methods
	async findAllAdmins() {
		try {
			const users = await this.mongo.db.collection<UserExt>('users').find({role: 'admin'}).sort({username: 1}).toArray()
			return users
		} catch (err: any) {
			throw new NotFoundException(err.message);
		}
	}

	async makeAdmin(uid: string, opt: UserOpt) {
		return await this.bestowPriviledgedRole('admin', uid);
	}

	// Curator methods
	async findAllCurators() {
		try {
			const users = await this.mongo.db.collection<UserExt>('users').find({role: 'curator'}).sort({username: 1}).toArray()
			return users
		} catch (err) {
			throw new NotFoundException();
		}
	}

	async makeCurator(uid: string, opt: UserOpt) {
		return await this.bestowPriviledgedRole('curator', uid);
	}

	// Moderator methods
	async findAllModerators() {
		try {
			const users = await this.mongo.db.collection<UserExt>('users').find({role: 'moderator'}).sort({username: 1}).toArray()
			return users
		} catch {
			throw new NotFoundException();
		}
	}

	async makeModerator(uid: string, opt: UserOpt) {
		return await this.bestowPriviledgedRole('moderator', uid);
	}

	/** Webhook */
	async handleWebhooks(webhook: WebhookEvent){
		try {
			if(webhook.type === 'user.created'){

				const user = webhook.data;
				const isFirstUser = await this.mongo.db.collection<UserExt>('users').countDocuments()
				const role: UserRoles = isFirstUser === 0 ? 'admin' : 'member'
				await this.createUser(user.id, role)

				return { status: 'processed' }

			} else if(webhook.type === 'user.updated') {

				const user = webhook.data;
				const extendedUser = await this.mongo.db.collection<UserExt>('users').findOne({id: user.id})
				extendedUser.username = user.username
				extendedUser.fullName = `${user.first_name} ${user.last_name}`
				if(user.has_image){ extendedUser.photoUrl = user.image_url }
				await this.mongo.updateOne(extendedUser, 'users')

				return { status: 'processed' }
				
			} else if(webhook.type === 'user.deleted'){

				const user = webhook.data;
				await this.mongo.db.collection<UserExt>('users').findOneAndDelete({id: user.id})
								
				return { status: 'processed' }

			}

		} catch(err: any){
			throw new BadRequestException(err.message)
		}
	}
}