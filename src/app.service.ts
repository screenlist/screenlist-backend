import { ConfigService } from '@nestjs/config';
import { Injectable, BadRequestException, StreamableFile } from '@nestjs/common';
import axios from 'axios';
import fetch from 'cross-fetch';
import { createReadStream } from 'fs';
import { join } from 'path';

@Injectable()
export class AppService {
	constructor(private configService: ConfigService) {}

	getHello(): string {
		return 'Copyright 2023, Makamuta Pty Ltd.';
	}

	async refreshClient(path: string) {
		const url = `${this.configService.get('CLIENT_URL')}/api/revalidate?secret=${this.configService.get('CLIENT_REVALIDATION_TOKEN')}&path=${path}`
		try {
			if(!path) { throw new BadRequestException('Provide the path') }
			await axios.get(url)
			return { status: 'refreshed' }
		} catch (err: any) {
			throw new BadRequestException(err.message)
		}
	}

	async getImage(path: string) {
    try {
      if(!path) { throw new BadRequestException('Provide the path') }
      const res = await fetch(path);
    	if(res.status >= 400){ throw new BadRequestException('Error Extracting Image') }
    	const blob = await res.blob()
    	if(blob.type == 'image/png' || blob.type == 'image/jpeg' || blob.type == 'image/webp'){
	    	const unit8 = new Uint8Array(await blob.arrayBuffer())
	    	return {uint8: unit8, type: blob.type}
	    } else { throw new BadRequestException('Unsupported File Extension') }
    } catch (err: any) {
      throw new BadRequestException(err.message)
    }
  }
}
