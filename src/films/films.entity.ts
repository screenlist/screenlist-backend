import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, ManyToMany , JoinTable  } from 'typeorm';
import { Company } from '../companies/companies.entity';
import { Role } from '../people/people.entity';
import { WatchLink } from '../platforms/platforms.entity';
import { Still } from '../stills/stills.entity';
import { User } from '../users/users.entity';


@Entity()
export class Film{
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	status: string;

	@Column({
		type: 'datetime',
		default: Date.now()
	})
	dateCreated: string;

	@Column({
		type: 'varchar'
	})
	name: string;

	@Column({
		type: 'varchar',
		nullable: true
	})
	posterUrl: string;

	@Column({
		type: 'varchar',
		nullable: true
	})
	trailerUrl: string;

	@Column({
		type: 'varchar'
	})
	filmType: string;

	@Column({
		type: 'varchar'
	})
	productionStage: string;

	@Column({
		type: 'int',
		nullable: true
	})
	runtime: number;

	@Column({
		type: 'text'
	})
	logline: string;

	@Column({
		type: 'text',
		nullable: true
	})
	plotSummary: string;

	@Column({
		type: 'datetime',
		nullable: true
	})
	releaseDate: string;

	@Column({
		type: 'varchar',
		nullable: true
	})
	initialPlatform: string;

	@OneToMany((type) => WatchLink, (WatchLink) => WatchLink.film)
	currentPlatforms: WatchLink[]

	@ManyToMany((type) => Company, (company) => company.filmsProduced)
	@JoinTable()
	productionCompanies: Company[]

	@ManyToMany((type) => Company, (company) => company.filmsDistributed)
	@JoinTable()
	distributionCompanies: Company[]

	@OneToMany((type) => Still, (still) => still.film)
	stillFrames: Still[]

	@ManyToMany((type) => User, (user) => user.filmContributions)
	@JoinTable()
	authors: User[]

	@OneToMany((type) => Role, (role) => role.film)
	credits: Role[]

	@OneToMany((type) => FilmHistory, (filmHistory) => filmHistory.film)
	history: FilmHistory[]
}

// A table to track the primary changes of the film table
@Entity()
export class FilmHistory{
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne((type) => Film, (film) => film.history)
	film: Film

	@Column({
		nullable: true
	})
	status: string;

	@Column({
		type: 'datetime',
		default: Date.now(),
		nullable: true
	})
	dateCreated: string;

	@Column({
		type: 'varchar',
		nullable: true
	})
	name: string;

	@Column({
		type: 'varchar',
		nullable: true
	})
	posterUrl: string;

	@Column({
		type: 'varchar',
		nullable: true
	})
	trailerUrl: string;

	@Column({
		type: 'varchar',
		nullable: true
	})
	filmType: string;

	@Column({
		type: 'varchar',
		nullable: true
	})
	productionStage: string;

	@Column({
		type: 'int',
		nullable: true
	})
	runtime: number;

	@Column({
		type: 'text',
		nullable: true
	})
	logline: string;

	@Column({
		type: 'text',
		nullable: true
	})
	plotSummary: string;

	@Column({
		type: 'datetime',
		nullable: true
	})
	releaseDate: string;

	@Column({
		type: 'varchar',
		nullable: true
	})
	initialPlatform: string;

	// Columns for record keeping
	@Column()
	action: string

	@Column()
	userId: string

	@Column({
		type: 'datetime',
		default: Date.now()
	})
	dateSaved: string;

	@Column()
	revision: number
}