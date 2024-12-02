import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  async invoke(query: string): Promise<string> {
    return query;
  }
}
