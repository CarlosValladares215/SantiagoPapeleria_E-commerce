import { Test, TestingModule } from '@nestjs/testing';
import { ContadoresService } from './contadores.service';

describe('ContadoresService', () => {
  let service: ContadoresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContadoresService],
    }).compile();

    service = module.get<ContadoresService>(ContadoresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
