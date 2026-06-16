import { Test, TestingModule } from '@nestjs/testing';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { VendorApprovalStatus } from '../../database/entities/vendor-profile.entity';

describe('VendorsController', () => {
  let controller: VendorsController;
  let mockVendorsService: any;

  beforeEach(async () => {
    mockVendorsService = {
      findById: jest.fn().mockResolvedValue({
        userId: 'vendor-1',
        companyName: 'My Vendor',
        approvalStatus: VendorApprovalStatus.ACTIVE,
      }),
      updateProfile: jest.fn().mockResolvedValue({
        userId: 'vendor-1',
        companyName: 'Updated Vendor',
      }),
      getVendorFinancials: jest.fn().mockResolvedValue({
        vendorId: 'vendor-1',
        totalSales: 500,
        totalBookings: 10,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VendorsController],
      providers: [
        { provide: VendorsService, useValue: mockVendorsService },
      ],
    }).compile();

    controller = module.get<VendorsController>(VendorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return vendor profile', async () => {
      const user = { userId: 'vendor-1' };
      const result = await controller.getProfile(user as any);
      expect(result.companyName).toBe('My Vendor');
      expect(mockVendorsService.findById).toHaveBeenCalledWith('vendor-1');
    });
  });

  describe('updateProfile', () => {
    it('should update vendor profile', async () => {
      const user = { userId: 'vendor-1' };
      const dto = { companyName: 'Updated Vendor' };
      const result = await controller.updateProfile(user as any, dto);
      expect(result.companyName).toBe('Updated Vendor');
      expect(mockVendorsService.updateProfile).toHaveBeenCalledWith('vendor-1', dto);
    });
  });

  describe('getMetrics', () => {
    it('should return vendor metrics', async () => {
      const user = { userId: 'vendor-1' };
      const result = await controller.getMetrics(user as any);
      expect(result.totalSales).toBe(500);
      expect(result.totalBookings).toBe(10);
      expect(mockVendorsService.getVendorFinancials).toHaveBeenCalledWith('vendor-1');
    });
  });
});
