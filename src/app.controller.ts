import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('invoke')
  invoke(@Query('query') query: string): Promise<string> {
    return this.appService.invoke(query);
  }
}
