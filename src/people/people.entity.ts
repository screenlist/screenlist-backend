import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, ManyToMany, OneToOne , JoinTable } from 'typeorm';
import { Film } from '../films/films.entity'

@Entity()
export class Person{
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		unique: true
	})
	names: string;

	@ManyToOne((type) => Role, (role) => role.people)
	roles: string;	
}


@Entity()
export class Role{
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column()
	subtitle: string;

	@Column()
	category: string;

	@Column({
		nullable: true
	})
	characterName: string;

	@Column({
		nullable: true
	})
	characterDescription: string;

	@ManyToOne((type) => Film, (film) => film.credits)
	film: Film;

	@OneToMany((type) => Person, (person) => person.roles)
	people: Person;
}