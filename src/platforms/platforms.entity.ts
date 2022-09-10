import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity()
export class Platform{
	@PrimaryGeneratedColumn()
	id: number

	@Column({
		type: 'varchar'
	})
	name: string

	@Column({
		type: 'varchar'
	})
	accessType: string

	@Column({
		type: 'varchar',
		nullable: true
	})
	url: string
}