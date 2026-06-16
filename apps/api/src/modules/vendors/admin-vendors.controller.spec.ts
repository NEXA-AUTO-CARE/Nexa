import { Test, TestingModule } from '@nestjs/testing';
import { AdminVendorsController } from '../admin/admin-vendors.controller';
import { VendorsService } from './vendors.service';
import { VendorApprovalStatus } from '../../database/entities/vendor-profile.entity';

describe('AdminVendorsController', () => {
  let controller: AdminVendorsController;
  let mockVendorsService: any;

  beforeEach(async () => {
    mockVendorsService = {
      findAllForAdmin: jest.fn().mockResolvedValue([
        { userId: '1', companyName: 'Vendor 1', approvalStatus: VendorApprovalStatus.ACTIVE },
      ]),
      createVendorByAdmin: jest.fn().mockResolvedValue({ userId: '2', companyName: 'New Vendor' }),
      updateVendorByAdmin: jest.fn().mockResolvedValue({ userId: '1', approvalStatus: VendorApprovalStatus.SUSPENDED }),
      getVendorFinancials: jest.fn().mockResolvedValue({ vendorId: '1', totalSales: 100, totalBookings: 2 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminVendorsController],
      providers: [
        { provide: VendorsService, useValue: mockVendorsService },
      ],
    }).compile();

    controller = module.get<AdminVendorsController>(AdminVendorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all vendors', async () => {
      const result = await controller.findAll();
      expect(result.length).toBe(1);
      expect(result[0].companyName).toBe('Vendor 1');
      expect(mockVendorsService.findAllForAdmin).toHaveBeenCalled();
    });
  });

  describe('createVendor', () => {
    it('should create a new vendor', async () => {
      const dto = { companyName: 'New Vendor' };
      const result = await controller.createVendor(dto as any);
      expect(result.companyName).toBe('New Vendor');
      expect(mockVendorsService.createVendorByAdmin).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateStatus', () => {
    it('should update vendor status', async () => {
      const dto = { status: VendorApprovalStatus.SUSPENDED };
      const result = await controller.update('1', dto as any);
      expect(result.approvalStatus).toBe(VendorApprovalStatus.SUSPENDED);
      expect(mockVendorsService.updateVendorByAdmin).toHaveBeenCalledWith('1', dto);
    });
  });

  describe('getFinancials', () => {
    it('should return vendor financials', async () => {
      const result = await controller.getFinancials('1');
      expect(result.totalSales).toBe(100);
      expect(result.totalBookings).toBe(2);
      expect(mockVendorsService.getVendorFinancials).toHaveBeenCalledWith('1');
    });
  });
});
