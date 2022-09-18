import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { Film } from '../films/films.entity';

@Entity()
export class Still{
	@PrimaryGeneratedColumn()
	id: string;

	@Column({
		unique: true
	})
	originalName: string;

	@Column()
	description: string;

	@Column({
		unique: true
	})
	url: string;

	@Column({
		unique: true
	})
	quality: string

	// @ManyToOne((type) => Film, (film) => film.stillFrames)
	// film: Film;
}