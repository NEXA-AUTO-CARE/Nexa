import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockAuthService = {
      changePassword: jest.fn().mockResolvedValue({ ok: true }),
    };

    mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue('development'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('changePassword', () => {
    it('should change password for authenticated user', async () => {
      const user = { userId: 'auth-user-1' };
      const dto = { newPassword: 'newStrongPassword123' };
      
      const result = await controller.changePassword(user as any, dto);
      
      expect(result).toEqual({ ok: true });
      expect(mockAuthService.changePassword).toHaveBeenCalledWith('auth-user-1', 'newStrongPassword123');
    });
  });
});
