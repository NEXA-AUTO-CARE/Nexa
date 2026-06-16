import { Test, TestingModule } from '@nestjs/testing';
import { VendorsService } from './vendors.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VendorProfile, User } from '../../database/entities';
import { VendorApprovalStatus } from '../../database/entities/vendor-profile.entity';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MessageTemplateService } from '../notifications/message-template.service';
import { ConfigService } from '@nestjs/config';

describe('VendorsService', () => {
  let service: VendorsService;
  let mockVendorRepo: any;
  let mockUserRepo: any;
  let mockUsersService: any;
  let mockRolesService: any;
  let mockNotificationsService: any;
  let mockMessageTemplateService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockVendorRepo = {
      save: jest.fn().mockImplementation(v => Promise.resolve({ ...v })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(v => v),
    };

    mockUserRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(u => u),
      save: jest.fn().mockImplementation(u => Promise.resolve({ ...u, userId: 'test-user-id' })),
    };

    mockUsersService = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findByPhone: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        userId: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test Vendor',
      }),
      findById: jest.fn().mockResolvedValue({
        userId: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test Vendor',
        role: { name: 'vendor' },
      }),
    };

    mockRolesService = {
      findByNameOrFail: jest.fn().mockResolvedValue({ roleId: 'test-role-id', name: 'vendor' }),
    };

    mockNotificationsService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    mockMessageTemplateService = {
      getTemplate: jest.fn().mockResolvedValue(null),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('https://nexaautocare.com'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        { provide: getRepositoryToken(VendorProfile), useValue: mockVendorRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: UsersService, useValue: mockUsersService },
        { provide: RolesService, useValue: mockRolesService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: MessageTemplateService, useValue: mockMessageTemplateService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<VendorsService>(VendorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createVendorByAdmin', () => {
    it('should create a vendor and send welcome email', async () => {
      const dto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        companyName: 'John Valeting',
      };

      const result = await service.createVendorByAdmin(dto);

      expect(mockUserRepo.create).toHaveBeenCalled();
      expect(mockVendorRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        vendorId: 'test-user-id',
        companyName: 'John Valeting',
        approvalStatus: VendorApprovalStatus.PENDING,
      }));
      expect(mockNotificationsService.sendEmail).toHaveBeenCalled();
      expect(result.companyName).toBe('John Valeting');
    });

    it('should throw error if email is already in use', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce({ userId: 'existing' });

      await expect(service.createVendorByAdmin({ email: 'test@example.com', companyName: 'Test', firstName: 'A', lastName: 'B' }))
        .rejects
        .toThrow('A user with this email or phone number already exists');
    });
  });

  describe('activateVendor', () => {
    it('should change status from PENDING to ACTIVE', async () => {
      mockVendorRepo.findOne.mockResolvedValueOnce({
        userId: 'test-user-id',
        approvalStatus: VendorApprovalStatus.PENDING,
      });

      await service.activateVendor('test-user-id');

      expect(mockVendorRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'test-user-id',
        approvalStatus: VendorApprovalStatus.ACTIVE,
      }));
    });
  });

  describe('findNearbyVendors', () => {
    it('should return vendors sorted by distance', async () => {
      mockVendorRepo.find.mockResolvedValueOnce([
        { vendorId: '1', latitude: '51.5072', longitude: '0.1276' }, // London
        { vendorId: '2', latitude: '51.7520', longitude: '-1.2577' }, // Oxford (approx 80km)
      ]);

      const result = await service.findNearbyVendors(51.5072, 0.1276, 50);

      // Should only include London vendor since Oxford is > 50km
      expect(result.length).toBe(1);
      expect(result[0].vendorId).toBe('1');
    });
  });
});
