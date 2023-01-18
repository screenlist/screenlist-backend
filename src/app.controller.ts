import { Controller, Get, Post, UseGuards, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { RolesGuard } from './users/roles.guard';
import { Roles } from './users/roles.decorator';

@Controller()
@UseGuards(RolesGuard)
export class AppController {
	constructor(private readonly appService: AppService) {}

	@Get()
	getHello(): string {
		return this.appService.getHello();
	}

	@Post('refresh')
	@Roles('member')
	async refreshClient(@Body('path') path: string){
		return await this.appService.refreshClient(path)
	}
}
