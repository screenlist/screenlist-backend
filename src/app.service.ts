import { ConfigService } from '@nestjs/config';
import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios'

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async refreshClient(path: string) {
    const url = `${this.configService.get('CLIENT_URL')}/api/revalidate?secret=${this.configService.get('CLIENT_REVALIDATION_TOKEN')}&path=${path}`
    try {
      if(!path) { throw new BadRequestException('Provide the path') }
      await axios.get(url)
      return { status: 'refreshed' }
    } catch (err: any) {
      console.log(err)
      throw new BadRequestException(err.message)
    }
  }
}
