import { Test, TestingModule } from '@nestjs/testing';
import { ErpSyncController } from './erp-sync.controller';

describe('ErpSyncController', () => {
  let controller: ErpSyncController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ErpSyncController],
    }).compile();

    controller = module.get<ErpSyncController>(ErpSyncController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
