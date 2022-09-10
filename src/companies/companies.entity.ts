import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity()
export class Company{
	@PrimaryGeneratedColumn()
	id: number

	@Column()
	name: string

	@Column({
		nullable: true
	})
	website: string
}