import { Injectable, ParseFileOptions } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, InsertResult } from 'typeorm';
import { CreateFilmDto, UpdateFilmDto } from './films.dto';
import { Film, FilmHistory } from './films.entity';
import { Company } from '../companies/companies.entity';
import { Person, Role } from '../people/people.entity';
import { Platform, WatchLink } from '../platforms/platforms.entity';
import { Still } from '../stills/stills.entity';
import { User } from '../users/users.entity';
import { Poster } from '../posters/posters.entity'

@Injectable()
export class FilmsService {
	constructor(
		@InjectRepository(Film)
		private filmRepository: Repository<Film>,

		@InjectRepository(FilmHistory)
		private filmHistoryRepository: Repository<FilmHistory>,

		@InjectRepository(Company)
		private companyRepository: Repository<Company>,

		@InjectRepository(Person)
		private personRepository: Repository<Person>,

		@InjectRepository(Role)
		private roleRepository: Repository<Role>,

		@InjectRepository(Platform)
		private platformRepository: Repository<Platform>,

		@InjectRepository(WatchLink)
		private watchLinkRepository: Repository<WatchLink>,

		@InjectRepository(Still)
		private stillRepository: Repository<Still>,

		@InjectRepository(User)
		private userRepository: Repository<User>
	){}

	async findAll(): Promise<Film[]> {
		return await this.filmRepository.find()
	}

	async findOne(id: number): Promise<Film> {
		return await this.filmRepository.findOneBy({id})
	}

	async create(film: CreateFilmDto): Promise<void> {
		let existingPlatforms: Platform[] = [];
		let existingPersons: Person[] = [];
		let existingCompanies: Company[] = [];
		let allPlatformLinks: WatchLink[] = [];
		let allStills: Still[] = [];
		let addFilm: Film;
		let existingFilm: Film = await this.filmRepository.findOneBy({slug: film.details.slug});

		// Adds platform watch links
		if(film.currentPlatforms){
			film.currentPlatforms.forEach(async (platform) => {
				const checkPlatform = await this.platformRepository.findOneBy({name: platform.name});
				const addLink = new WatchLink();
				addLink.url = platform.url;
				addLink.accessType = platform.accessType;
				if(checkPlatform){				
					addLink.platform = checkPlatform;				
					this.watchLinkRepository.save(addLink);
					allPlatformLinks.push(addLink)
				} else {
					const newPlatform = new Platform()
					newPlatform.name = platform.name
					this.platformRepository.save(newPlatform)

					addLink.platform = newPlatform
					this.watchLinkRepository.save(addLink);
					allPlatformLinks.push(addLink)
				}
			});
		};
		// Adds still frames

	}
}