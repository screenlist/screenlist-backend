import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity()
export class Person{
	@PrimaryGeneratedColumn()
	id: number

	@Column()
	names: string

	@Column()
	role: string
}