import { Test, TestingModule } from '@nestjs/testing';
import { PostcodesService } from './postcodes.service';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('PostcodesService', () => {
  let service: PostcodesService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'app.idealPostcodesApiKey') {
        return 'test-api-key';
      }
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostcodesService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PostcodesService>(PostcodesService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('lookup', () => {
    it('should throw BAD_REQUEST if postcode is empty', async () => {
      await expect(service.lookup('')).rejects.toThrow(
        new HttpException('Postcode is required', HttpStatus.BAD_REQUEST),
      );
    });

    it('should return mock result for test postcode ID1 1QD without API key', async () => {
      const mockResult = [
        {
          line_1: 'Flat 1',
          line_2: '15 Union Street',
          line_3: '',
          post_town: 'ABERDEEN',
          postcode: 'ID1 1QD',
          latitude: 57.1497,
          longitude: -2.0943,
          uprn: '123456789',
        },
      ];

      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => ({
          code: 2000,
          result: mockResult,
        }),
      } as any);

      const result = await service.lookup('ID1 1QD');
      expect(result).toEqual(mockResult);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.ideal-postcodes.co.uk/v1/postcodes/ID11QD',
      );
    });

    it('should throw NOT_FOUND for error code 4040', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 404,
        json: async () => ({
          code: 4040,
          message: 'Postcode not found',
        }),
      } as any);

      await expect(service.lookup('AB12 3CD')).rejects.toThrow(
        new HttpException(
          "We couldn't find that postcode. Please check and try again.",
          HttpStatus.NOT_FOUND,
        ),
      );
    });

    it('should throw INTERNAL_SERVER_ERROR for invalid api key code 4020', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 401,
        json: async () => ({
          code: 4020,
          message: 'Invalid key',
        }),
      } as any);

      await expect(service.lookup('AB12 3CD')).rejects.toThrow(
        new HttpException(
          'Failed to validate address. Service configuration issue.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });
});
