import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, ManyToMany, OneToOne, JoinTable  } from 'typeorm';
import { Company } from '../companies/companies.entity';
import { Role } from '../people/people.entity';
import { WatchLink } from '../platforms/platforms.entity';
import { Still } from '../stills/stills.entity';
import { User } from '../users/users.entity';
import { Poster } from '../posters/posters.entity'

@Entity()
export class Film{
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		default: 'public'
	})
	status: string;

	@Column({
		type: 'datetime',
		default: () => 'NOW()'
	})
	dateCreated: Date;

	@Column({
		type: 'varchar',
	})
	name: string;

	@Column({
		type: 'varchar',
		nullable: true
	})
	trailerUrl: string;

	@Column({
		type: 'varchar'
	})
	type: string;

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
	releaseDate: Date;

	@Column({
		type: 'varchar',
		nullable: true
	})
	initialPlatform: string;

	@Column({
		unique: true
	})
	slug: string;

	@OneToMany((type) => WatchLink, (WatchLink) => WatchLink.film)
	currentPlatforms: WatchLink[];

	@ManyToMany((type) => Company, (company) => company.filmsProduced)
	@JoinTable()
	productionCompanies: Company[];

	@ManyToMany((type) => Company, (company) => company.filmsDistributed)
	@JoinTable()
	distributionCompanies: Company[];

	@OneToMany((type) => Still, (still) => still.film)
	stillFrames: Still[];

	@ManyToMany((type) => User, (user) => user.filmContributions)
	@JoinTable()
	authors: User[];

	@OneToMany((type) => Role, (role) => role.film)
	credits: Role[];

	@OneToMany((type) => FilmHistory, (filmHistory) => filmHistory.film)
	history: FilmHistory[];
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
		nullable: true
	})
	dateCreated: Date;

	@Column({
		type: 'varchar',
		nullable: true
	})
	name: string;

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
	releaseDate: Date;

	@Column({
		type: 'varchar',
		nullable: true
	})
	initialPlatform: string;

	@Column({
		unique: true
	})
	slug: string;

	// Columns for record keeping
	@Column()
	action: string

	@Column()
	userId: string

	@Column({
		type: 'datetime',
		default: () => 'NOW()'
	})
	dateSaved: Date;

	@Column()
	revision: number
}