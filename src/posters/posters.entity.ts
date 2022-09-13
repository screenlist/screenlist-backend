import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { Film } from '../films/films.entity';

@Entity()
export class Poster{
	@PrimaryGeneratedColumn()
	id: string;

	@Column()
	description: string;

	@Column({
		type: 'varchar',
		nullable: false,
		unique: true
	})
	url: string;

	@OneToOne((type) => Film, (film) => film.stillFrames)
	film: Film;
}