import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, ManyToMany } from 'typeorm';
import { Film } from '../films/films.entity'

@Entity()
export class Company{
	@PrimaryGeneratedColumn()
	id: number

	@Column({
		unique: true
	})
	name: string

	@Column({
		nullable: true
	})
	website: string

	// @ManyToMany((type) => Film, (film) => film.distributionCompanies)
	// filmsDistributed: Film[]

	// @ManyToMany((type) => Film, (film) => film.productionCompanies)
	// filmsProduced: Film[]
}