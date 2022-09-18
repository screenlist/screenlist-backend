import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { Film } from '../films/films.entity';

@Entity()
export class Poster{
	@PrimaryGeneratedColumn()
	id: string;

	@Column({
		unique: true
	})
	originalName: string;

	@Column()
	description: string;

	@Column({
		type: 'varchar',
		nullable: false,
		unique: true
	})
	url: string;

	@Column({
		unique: true
	})
	quality: string;

	@ManyToOne((type) => Film, (film) => film.posters)
	film: Film;
}