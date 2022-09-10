import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity()
export class Still{
	@PrimaryGeneratedColumn()
	id: string

	@Column()
	name: string

	@Column()
	description: string

	@Column({
		type: 'varchar',
		nullable: false
	})
	url: string
}