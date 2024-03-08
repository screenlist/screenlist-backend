import { 
	Controller, 
	UseGuards,
	Get,
	Post,
	Delete,
	Patch,
	Body,
	Param,
	Query,
	Headers,
	UseInterceptors,
	UploadedFile
} from '@nestjs/common';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { ContentService } from './content.service';
import { AuthService } from '../auth/auth.service';
import { CreateContentDto, UpdateContentDto } from './content.dto';
import { ContentOpt } from './content.types';
import {
	PhotoDto
} from '../films/films.dto';
import { ImageOpt } from '../films/films.types';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('content')
@UseGuards(RolesGuard)
export class ContentController {
	constructor(
		private contentService: ContentService,
		private authService: AuthService
	){}
		/* MISC METHODS */
	@Get('episodes')
	async getEpisodes(){
		return await this.contentService.getEpisodes()
	}

	/* CONTENT PHOTO METHODS */
	@Post('photo')
	@Roles('curator')
	@UseInterceptors(FileInterceptor('photo'))
	async uploadPhoto(
		@Query('id') id: string,
		@Query('index') index: number,
		@Headers('x-user-id') userId: string,
		@UploadedFile() photo: Express.Multer.File
	){
		const imageOptions: ImageOpt = {
			user: userId,
			time: new Date(),
			parentId: id,
			parentKind: 'content',
			index: index
		}
		return await this.contentService.uploadPhoto(imageOptions, photo);
	}

	@Patch('photo')
	@Roles('curator')
	async updatePhoto(
		@Query('id') id: string,
		@Query('index') index: number,
		@Body() updatePhoto : PhotoDto,
		@Headers('x-user-id') userId: string,
	){
		const imageOptions: ImageOpt = {
			user: userId,
			time: new Date(),
			parentId: id,
			parentKind: 'content',
			index: index
		}
		return await this.contentService.updatePhoto(updatePhoto, imageOptions);
	}

	@Delete('photo')
	@Roles('member')
	async removePhoto(
		@Query('id') id: string,
		@Query('index') index: number,
		@Headers('x-user-id') userId: string
	){
		const imageOptions: ImageOpt = {
			user: userId,
			time: new Date(),
			parentId: id,
			parentKind: 'content',
			index: index
		}
		return await this.contentService.removePhoto(imageOptions)
	}

	/* BLOG METHODS */
	@Get('blog')
	async findAllBlogs(
		@Query('page') page: number,
		@Query('limit') limit: number
	){
		return await this.contentService.findBlogArticles(page, limit);
	}

	@Post('blog')
	@Roles('curator')
	async createBlog(
		@Headers('x-user-id') userId: string,
		@Body() createContent: CreateContentDto
	){
		const contentOptions: ContentOpt = {
			user: userId,
			time: new Date()
		}
		return await this.contentService.createBlogArticle(createContent, contentOptions);
	}

	@Get('blog/:slug')
	async findOneBlog(@Param('slug') slug: string ){
		return await this.contentService.findOne(slug, 'blog');
	}

	@Patch('blog/:slug')
	@Roles('curator')
	async updateOneBlog(
		@Param('slug') slug: string,
		@Headers('x-user-id') userId: string,
		@Body() updateContent: UpdateContentDto
	) {
		const contentOptions: ContentOpt = {
			user: userId,
			time: new Date()
		}
		return await this.contentService.updateOne(updateContent, contentOptions, slug, 'blog');
	}

	@Delete('blog/:slug')
	@Roles('curator')
	async deleteOneBlog(
		@Param('slug') slug: string,
		@Headers('x-user-id') userId: string
	) {
		const contentOptions: ContentOpt = {
			user: userId,
			time: new Date()
		}
		return await this.contentService.deleteOne(contentOptions, slug, 'blog');
	}

	/* ABOUT METHODS */
	@Post('about')
	@Roles('admin')
	async createAbout(
		@Headers('x-user-id') userId: string,
		@Body() createContent: CreateContentDto
	){
		const contentOptions: ContentOpt = {
			user: userId,
			time: new Date()
		}
		return await this.contentService.createAbout(createContent, contentOptions);
	}

	@Get('about')
	async findOneAbout(){
		return await this.contentService.findOne('about', 'about');
	}

	@Patch('about')
	@Roles('admin')
	async updateOneAbout(
		@Headers('x-user-id') userId: string,
		@Body() updateContent: UpdateContentDto
	) {
		const contentOptions: ContentOpt = {
			user: userId,
			time: new Date()
		}
		return await this.contentService.updateOne(updateContent, contentOptions, 'about', 'about');
	}

	@Delete('about')
	@Roles('admin')
	async deleteOneAbout(
		@Headers('x-user-id') userId: string
	) {
		const contentOptions: ContentOpt = {
			user: userId,
			time: new Date()
		}
		return await this.contentService.deleteOne(contentOptions, 'about', 'about');
	}

	/* PRIVACY METHODS */
	@Post('privacy')
	@Roles('admin')
	async createPrivacy(
		@Headers('x-user-id') userId: string,
		@Body() createContent: CreateContentDto
	){
		const contentOptions: ContentOpt = {
			user: userId,
			time: new Date()
		}
		return await this.contentService.createPrivacyPolicy(createContent, contentOptions);
	}

	@Get('privacy')
	async findOnePrivacy(){
		return await this.contentService.findOne('privacy', 'privacy');
	}

	@Patch('privacy')
	@Roles('admin')
	async updateOnePrivacy(
		@Headers('x-user-id') userId: string,
		@Body() updateContent: UpdateContentDto
	) {
		const contentOptions: ContentOpt = {
			user: userId,
			time: new Date()
		}
		return await this.contentService.updateOne(updateContent, contentOptions, 'privacy', 'privacy');
	}

	@Delete('privacy')
	@Roles('admin')
	async deleteOnePrivacy(
		@Param('id') id: string,
		@Headers('x-user-id') userId: string
	) {
		const contentOptions: ContentOpt = {
			user: userId,
			time: new Date()
		}
		return await this.contentService.deleteOne(contentOptions, 'privacy', 'privacy');
	}

	/* TOS METHODS */
	@Post('tos')
	@Roles('admin')
	async createTos(
		@Headers('x-user-id') userId: string,
		@Body() createContent: CreateContentDto
	){
		const contentOptions: ContentOpt = {
			user: userId,
			time: new Date()
		}
		return await this.contentService.createTermsOfService(createContent, contentOptions);
	}

	@Get('tos')
	async findOneTos(){
		return await this.contentService.findOne('tos', 'tos');
	}

	@Patch('tos')
	@Roles('admin')
	async updateOneTos(
		@Headers('x-user-id') userId: string,
		@Body() updateContent: UpdateContentDto
	) {
		const contentOptions: ContentOpt = {
			user: userId,
			time: new Date()
		}
		return await this.contentService.updateOne(updateContent, contentOptions, 'tos', 'tos');
	}

	@Delete('tos')
	@Roles('admin')
	async deleteOneTos(
		@Headers('x-user-id') userId: string
	) {
		const contentOptions: ContentOpt = {
			user: userId,
			time: new Date()
		}
		return await this.contentService.deleteOne(contentOptions, 'tos', 'tos');
	}

	/* CONTRIBUTIONS METHODS */
	@Post('contributions')
	@Roles('admin')
	async createContributionsGuide(
		@Headers('x-user-id') userId: string,
		@Body() createContent: CreateContentDto
	){
		const contentOptions: ContentOpt = {
			user: userId,
			time: new Date()
		}
		return await this.contentService.createContributionsGuide(createContent, contentOptions);
	}

	@Get('contributions')
	async findOneContributionsGuide(){
		return await this.contentService.findOne('contributions', 'contributions');
	}

	@Patch('contributions')
	@Roles('admin')
	async updateOneContributionsGuide(
		@Headers('x-user-id') userId: string,
		@Body() updateContent: UpdateContentDto
	) {
		const contentOptions: ContentOpt = {
			user: userId,
			time: new Date()
		}
		return await this.contentService.updateOne(updateContent, contentOptions, 'contributions', 'contributions');
	}

	@Delete('contributions')
	@Roles('admin')
	async deleteOneContributionsGuide(
		@Headers('x-user-id') userId: string
	) {
		const contentOptions: ContentOpt = {
			user: userId,
			time: new Date()
		}
		return await this.contentService.deleteOne(contentOptions, 'contributions', 'contributions');
	}
}
