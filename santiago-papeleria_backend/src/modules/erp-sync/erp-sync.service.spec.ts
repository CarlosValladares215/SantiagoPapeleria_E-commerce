import { Test, TestingModule } from '@nestjs/testing';
import { ErpSyncService } from './erp-sync.service';

describe('ErpSyncService', () => {
  let service: ErpSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ErpSyncService],
    }).compile();

    service = module.get<ErpSyncService>(ErpSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
