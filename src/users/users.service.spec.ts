import { Test, TestingModule } from '@nestjs/testing';
import {expect, jest, test} from '@jest/globals';
import { ModuleMocker, MockFunctionMetadata } from 'jest-mock';
import { UsersService } from './users.service';
import { 
	CreateUserDto,  
	UpdateUserDto,
	CreateVotesDto,
	UpdateVotesDto,
	CreateRequestDto,
	UpdateRequestDto,
	CreateJournalistInfoDto,
	UpdateJournalistInfoDto,
} from '../users/users.dto';
import { UserOpt, VoteOpt, RequestOpt} from './users.types';
// External services
import { StorageService } from '../storage/storage.service';
import { DatabaseService } from '../database/database.service';
import { AuthService } from '../auth/auth.service';
// External modules
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';

const moduleMocker = new ModuleMocker(globalThis)

describe('UsersService', () => {
	let service: UsersService;
	// let database: DatabaseService;
	// let auth: AuthService;
	// let storage: StorageService;
	let value: never

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [UsersService],
		})
		.useMocker((token) => {
			if (token === StorageService) {
				return { createUser: jest.fn().mockResolvedValue(value) };
			}
			if (typeof token === 'function') {
				const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;
				const Mock = moduleMocker.generateFromMetadata(mockMetadata);
				return new Mock();
			}
		})
		.compile();

		service = module.get(UsersService);
	});



	it('create a user', async () => {
		const data: CreateUserDto = {
			userName: 'alexkokobane',
			uid: '123456789',
			role: 'member',
			created: new Date(),
			lastUpdated: new Date()
		}
		const options: UserOpt = {
			user: '123456789',
			time: new Date()
		}
		const result = {
			'status': 'created',
			'username': 'alexkokobane'
		}
		await expect(service.createUser(data, options)).resolves.toBe(result)
	})
});
