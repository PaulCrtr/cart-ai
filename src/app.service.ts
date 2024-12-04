import { Injectable } from '@nestjs/common';
import { WorkflowService } from './workflow/workflow.service';

@Injectable()
export class AppService {
  constructor(private workflowService: WorkflowService) {}

  async invoke(query: string): Promise<string> {
    const streamResults = await this.workflowService.processStream(query);
    return streamResults;
  }
}
