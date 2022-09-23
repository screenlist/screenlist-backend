import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, ManyToMany, OneToOne, JoinTable  } from 'typeorm';
import { Role } from '../people/people.entity';
import { WatchLink } from '../platforms/platforms.entity';
import { Still } from '../stills/stills.entity';
import { User } from '../users/users.entity';
import { Poster } from '../posters/posters.entity'

export class Film{
	key:string;
	status: string;
	dateCreated: Date;
	name: string;
	trailerUrl: string;
	type: string;
	productionStage: string;
	runtime: number;
	logline: string;
	plotSummary: string;
	releaseDate: Date;
	initialPlatform: string;
	slug: string;
	posters: [{
		originalName: string;
		description: string;
		url: string;
		quality: string;
	}];
	stills: [{
		originalName: string;
		description: string;
		url: string;
		quality: string;
	}];

	@OneToMany((type) => WatchLink, (WatchLink) => WatchLink.film)
	currentPlatforms: WatchLink[];

	// @ManyToMany((type) => Company, (company) => company.filmsProduced)
	// @JoinTable()
	// productionCompanies: Company[];

	// @ManyToMany((type) => Company, (company) => company.filmsDistributed)
	// @JoinTable()
	// distributionCompanies: Company[];

	@ManyToMany((type) => User, (user) => user.filmContributions)
	@JoinTable()
	authors: User[];

	@OneToMany((type) => Role, (role) => role.film)
	credits: Role[];
}

// export class Company{
// 	key:
// }

// A table to track the primary changes of the film table
@Entity()
export class FilmHistory{
	@PrimaryGeneratedColumn()
	id: number;

	// @ManyToOne((type) => Film, (film) => film.history)
	// film: Film

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
	action: string;

	@Column()
	userId: string;

	@Column({
		type: 'datetime',
		default: () => 'NOW()'
	})
	dateSaved: Date;

	@Column()
	revision: number;
}