import { 
	Controller, 
	UseGuards,
	Get,
	Post,
	Put,
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
	CreateContentPhotoDto,
	UpdateContentPhotoDto
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
	/* CONTENT PHOTO METHODS */
	@Post('photo')
	@Roles('curator')
	@UseInterceptors(FileInterceptor('photo'))
	async uploadPhoto(
		@Query('id') id: string,
		@Query('index') index: string,
		@Headers('AuthorizationToken') idToken: string,
		@UploadedFile() photo: Express.Multer.File
	){
		const imageOptions: ImageOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			parentId: id,
			parentKind: 'Content',
			imageId: index
		}
		return await this.contentService.uploadPhoto(imageOptions, photo);
	}

	@Patch('photo')
	@Roles('curator')
	async updatePhoto(
		@Query('id') id: string,
		@Query('index') index: string,
		@Body() updatePhoto : UpdateContentPhotoDto,
		@Headers('AuthorizationToken') idToken: string,
	){
		const imageOptions: ImageOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			parentId: id,
			parentKind: 'Content',
			imageId: index
		}
		return await this.contentService.updatePhoto(updatePhoto, imageOptions);
	}

	@Delete('photo')
	@Roles('member')
	async removePhoto(
		@Query('id') id: string,
		@Query('index') index: string,
		@Headers('AuthorizationToken') idToken: string
	){
		const imageOptions: ImageOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date(),
			parentId: id,
			parentKind: 'Content',
			imageId: index
		}
		return await this.contentService.removePhoto(imageOptions)
	}

	/* BLOG METHODS */
	@Get('blog')
	async findAllBlogs(){
		return await this.contentService.findBlogArticles();
	}

	@Post('blog')
	@Roles('curator')
	async createBlog(
		@Headers('AuthorizationToken') idToken: string,
		@Body() createContent: CreateContentDto
	){
		const contentOptions: ContentOpt = {
			user: await this.authService.getUserUid(idToken),
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
		@Headers('AuthorizationToken') idToken: string,
		@Body() updateContent: UpdateContentDto
	) {
		const contentOptions: ContentOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date()
		}
		return await this.contentService.updateOne(updateContent, contentOptions, slug, 'blog');
	}

	@Delete('blog/:slug')
	@Roles('curator')
	async deleteOneBlog(
		@Param('slug') slug: string,
		@Headers('AuthorizationToken') idToken: string
	) {
		const contentOptions: ContentOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date()
		}
		return await this.contentService.deleteOne(contentOptions, slug, 'blog');
	}

	/* ABOUT METHODS */
	@Post('about')
	@Roles('admin')
	async createAbout(
		@Headers('AuthorizationToken') idToken: string,
		@Body() createContent: CreateContentDto
	){
		const contentOptions: ContentOpt = {
			user: await this.authService.getUserUid(idToken),
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
		@Headers('AuthorizationToken') idToken: string,
		@Body() updateContent: UpdateContentDto
	) {
		const contentOptions: ContentOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date()
		}
		return await this.contentService.updateOne(updateContent, contentOptions, 'about', 'about');
	}

	@Delete('about')
	@Roles('admin')
	async deleteOneAbout(
		@Headers('AuthorizationToken') idToken: string
	) {
		const contentOptions: ContentOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date()
		}
		return await this.contentService.deleteOne(contentOptions, 'about', 'about');
	}

	/* PRIVACY METHODS */
	@Post('privacy')
	@Roles('admin')
	async createPrivacy(
		@Headers('AuthorizationToken') idToken: string,
		@Body() createContent: CreateContentDto
	){
		const contentOptions: ContentOpt = {
			user: await this.authService.getUserUid(idToken),
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
		@Headers('AuthorizationToken') idToken: string,
		@Body() updateContent: UpdateContentDto
	) {
		const contentOptions: ContentOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date()
		}
		return await this.contentService.updateOne(updateContent, contentOptions, 'privacy', 'privacy');
	}

	@Delete('privacy')
	@Roles('admin')
	async deleteOnePrivacy(
		@Param('id') id: string,
		@Headers('AuthorizationToken') idToken: string
	) {
		const contentOptions: ContentOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date()
		}
		return await this.contentService.deleteOne(contentOptions, 'privacy', 'privacy');
	}

	/* TOS METHODS */
	@Post('tos')
	@Roles('admin')
	async createTos(
		@Headers('AuthorizationToken') idToken: string,
		@Body() createContent: CreateContentDto
	){
		const contentOptions: ContentOpt = {
			user: await this.authService.getUserUid(idToken),
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
		@Headers('AuthorizationToken') idToken: string,
		@Body() updateContent: UpdateContentDto
	) {
		const contentOptions: ContentOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date()
		}
		return await this.contentService.updateOne(updateContent, contentOptions, 'tos', 'tos');
	}

	@Delete('tos')
	@Roles('admin')
	async deleteOneTos(
		@Headers('AuthorizationToken') idToken: string
	) {
		const contentOptions: ContentOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date()
		}
		return await this.contentService.deleteOne(contentOptions, 'tos', 'tos');
	}

	/* CONTRIBUTIONS METHODS */
	@Post('contributions')
	@Roles('admin')
	async createContributionsGuide(
		@Headers('AuthorizationToken') idToken: string,
		@Body() createContent: CreateContentDto
	){
		const contentOptions: ContentOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date()
		}
		return await this.contentService.createPrivacyPolicy(createContent, contentOptions);
	}

	@Get('contributions')
	async findOneContributionsGuide(){
		return await this.contentService.findOne('contributions', 'contributions');
	}

	@Patch('contributions')
	@Roles('admin')
	async updateOneContributionsGuide(
		@Headers('AuthorizationToken') idToken: string,
		@Body() updateContent: UpdateContentDto
	) {
		const contentOptions: ContentOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date()
		}
		return await this.contentService.updateOne(updateContent, contentOptions, 'contributions', 'contributions');
	}

	@Delete('contributions')
	@Roles('admin')
	async deleteOneContributionsGuide(
		@Headers('AuthorizationToken') idToken: string
	) {
		const contentOptions: ContentOpt = {
			user: await this.authService.getUserUid(idToken),
			time: new Date()
		}
		return await this.contentService.deleteOne(contentOptions, 'contributions', 'contributions');
	}
}
