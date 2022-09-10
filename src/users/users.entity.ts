import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User{
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		type: 'varchar'
	})
	email: string;

	@Column({
		type: 'varchar'
	})
	hash: string;

	@Column({
		type: 'varchar'
	})
	salt: string;

	@Column({
		type: 'varchar'
	})
	username: string;

	@Column()
	filmContribution: string;

	@Column()
	seriesContribution: string;

	@Column({
		type: 'varchar',
		default: 'contributor'
	})
	role: string;
}