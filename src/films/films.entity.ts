import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity()
export class Film{
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	currentDraft: number;

	@Column()
	status: string

	@OneToMany((type) => FilmDraft, (filmDraft) => filmDraft.film)
	drafts: FilmDraft[];
}


@Entity()
export class FilmDraft{
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		type: 'int',
		nullable: false,
		unique: true
	})
	draftNumber: number;

	@Column({
		type: 'varchar',
		nullable: false
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
	trailerUrl: string

	@Column({
		type: 'varchar',
		nullable: false
	})
	filmType: string

	@Column({
		type: 'varchar',
		nullable: false
	})
	productionStage: string

	@Column({
		type: 'int',
		nullable: true
	})
	runtime: number

	@Column({
		type: 'text',
		nullable: false
	})
	logline: string

	@Column({
		type: 'text',
		nullable: true
	})
	plotSummary

	@Column({
		type: 'date',
		nullable: true
	})
	releaseDate: string

	@Column({
		type: 'varchar',
		nullable: true
	})
	initialPlatform: string

	@Column({
		type: 'varchar',
		nullable: true
	})
	currentPlatforms: string

	@Column()
	productionCompanies: string

	@Column()
	distributionCompanies: string

	@Column()
	stillFrames: string

	@Column()
	authors: string

	@ManyToOne((type) => Film, (film) => film.drafts)
	film: Film;
}