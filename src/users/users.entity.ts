import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { Film } from '../films/films.entity';

@Entity()
export class User{
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		type: 'varchar'
	})
	email: string;

	@Column({
		type: 'varchar'
	})
	hash: string;

	@Column({
		type: 'varchar'
	})
	salt: string;

	@Column({
		type: 'varchar'
	})
	username: string;

	@ManyToMany((type) => Film, (film) => film.authors)
	filmContributions: string;

	@Column()
	seriesContribution: string;

	@Column({
		type: 'varchar',
		default: 'contributor'
	})
	role: string;
}