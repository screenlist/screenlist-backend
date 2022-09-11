import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { Film } from '../films/films.entity'

@Entity()
export class Still{
	@PrimaryGeneratedColumn()
	id: string

	@Column()
	fileName: string

	@Column()
	description: string

	@Column({
		type: 'varchar',
		nullable: false
	})
	url: string

	@ManyToOne((type) => Film, (film) => film.stillFrames)
	film: Film
}