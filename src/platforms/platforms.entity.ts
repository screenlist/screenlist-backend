import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, ManyToMany } from 'typeorm';
import { Film } from '../films/films.entity';

@Entity()
export class Platform{
	@PrimaryGeneratedColumn()
	id: number

	@Column({
		type: 'varchar',
		unique: true
	})
	name: string;

	@OneToMany((type) => WatchLink, (watchLink) => watchLink.platform)
	watchLinks: WatchLink[]
}

@Entity()
export class WatchLink{
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		type: 'varchar'
	})
	accessType: string

	@Column({
		type: 'varchar',
		nullable: true
	})
	url: string;

	@ManyToOne((type) => Film, (film) => film.currentPlatforms)
	film: Film

	@ManyToOne((type) => Platform, (platform) => platform.watchLinks)
	platform: Platform;
}