import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRole } from '@nexa/shared';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { User, VendorProfile } from '../../database/entities';
import { VendorApprovalStatus } from '../../database/entities/vendor-profile.entity';
import { MessageTemplateService } from '../notifications/message-template.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RolesService } from '../roles/roles.service';
import { normalizeEmail, normalizePhone } from '../users/users.service';
import { CreateVendorDto, UpdateVendorDto } from './dto/create-vendor.dto';
import { ConfigService } from '@nestjs/config';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class VendorsService implements OnModuleInit {
  private readonly logger = new Logger(VendorsService.name);

  constructor(
    @InjectRepository(VendorProfile)
    private readonly vendorRepo: Repository<VendorProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly roles: RolesService,
    private readonly notifications: NotificationsService,
    private readonly templateService: MessageTemplateService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    await this.syncMissingVendorProfiles();
  }

  private async syncMissingVendorProfiles() {
    try {
      const vendorRole = await this.roles.findByNameOrFail(UserRole.VENDOR);

      const legacyVendors = await this.userRepo
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.vendorProfile', 'vendorProfile')
        .where('user.roleId = :roleId', { roleId: vendorRole.roleId })
        .andWhere('vendorProfile.vendorId IS NULL')
        .getMany();

      if (legacyVendors.length > 0) {
        this.logger.log(
          `Found ${legacyVendors.length} legacy vendor users missing a VendorProfile. Auto-repairing...`,
        );
        const newProfiles = legacyVendors.map((user) =>
          this.vendorRepo.create({
            vendorId: user.userId,
            approvalStatus: VendorApprovalStatus.ACTIVE, // Assuming legacy vendors are already active
            companyName: user.displayName || 'Legacy Vendor',
          }),
        );

        await this.vendorRepo.save(newProfiles);
        this.logger.log(
          `Successfully auto-repaired ${legacyVendors.length} VendorProfile records.`,
        );
      }
    } catch (err) {
      this.logger.error('Failed to sync missing vendor profiles', err);
    }
  }

  async createVendorByAdmin(dto: CreateVendorDto): Promise<VendorProfile> {
    const email = dto.email ? normalizeEmail(dto.email) : null;
    const phoneNumber = dto.phoneNumber
      ? normalizePhone(dto.phoneNumber)
      : null;

    if (!email) {
      throw new ConflictException('Vendor must have an email address');
    }

    const existingUser = await this.userRepo.findOne({
      where: [{ email }, { phoneNumber: phoneNumber ?? undefined }],
    });

    if (existingUser) {
      throw new ConflictException(
        'A user with this email or phone number already exists',
      );
    }

    const role = await this.roles.findByNameOrFail(UserRole.VENDOR);

    // Generate random password (min 12 chars)
    const rawPassword = randomBytes(9).toString('base64'); // 9 bytes = 12 base64 chars
    const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_ROUNDS);

    const displayName = `${dto.firstName} ${dto.lastName}`.trim();

    const user = this.userRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email,
      phoneNumber,
      roleId: role.roleId,
      displayName,
      otpVerified: true, // Auto-verified since admin created it
      passwordHash,
    });

    const savedUser = await this.userRepo.save(user);

    const vendorProfile = this.vendorRepo.create({
      vendorId: savedUser.userId,
      approvalStatus: VendorApprovalStatus.PENDING,
      companyName: dto.companyName || null,
      latitude: dto.latitude?.toString() ?? null,
      longitude: dto.longitude?.toString() ?? null,
      addressLine1: dto.addressLine1 ?? null,
      addressLine2: dto.addressLine2 ?? null,
      addressLine3: dto.addressLine3 ?? null,
      postTown: dto.postTown ?? null,
      postcode: dto.postcode ?? null,
      uprn: dto.uprn ?? null,
    });

    const savedProfile = await this.vendorRepo.save(vendorProfile);

    // Dispatch email
    await this.dispatchVendorWelcomeEmail(savedUser, rawPassword);

    return savedProfile;
  }

  private async dispatchVendorWelcomeEmail(user: User, rawPassword: string) {
    if (!user.email) return;

    // Use a default hardcoded template if the DB doesn't have one
    const loginLink =
      this.config.get<string>('app.frontendUrl', 'https://nexaautocare.com') +
      '/vendor/login';

    await this.notifications.sendEmail(
      user.email,
      'Welcome to NEXA - Vendor Account Created',
      `<p>Hi ${user.displayName},</p><p>Your vendor account has been created.</p><p>Your temporary password is: <strong>${rawPassword}</strong></p><p><a href="${loginLink}">Login here</a></p><p>You will be required to change your password upon your first login.</p>`,
    );

    this.logger.log(`Dispatched vendor welcome email to ${user.email}`);
  }

  async findAllForAdmin(): Promise<VendorProfile[]> {
    return this.vendorRepo.find({
      relations: ['user'],
      order: { createdOn: 'DESC' },
    });
  }

  async findById(vendorId: string): Promise<VendorProfile> {
    const profile = await this.vendorRepo.findOne({
      where: { vendorId },
      relations: ['user'],
    });
    if (!profile) throw new NotFoundException('Vendor profile not found');
    return profile;
  }

  async updateVendorByAdmin(
    vendorId: string,
    dto: UpdateVendorDto,
  ): Promise<VendorProfile> {
    const profile = await this.findById(vendorId);
    if (dto.companyName !== undefined) profile.companyName = dto.companyName;
    if (dto.approvalStatus !== undefined)
      profile.approvalStatus = dto.approvalStatus as VendorApprovalStatus;

    // Address updates
    if (dto.latitude !== undefined)
      profile.latitude = dto.latitude !== null ? dto.latitude.toString() : null;
    if (dto.longitude !== undefined)
      profile.longitude =
        dto.longitude !== null ? dto.longitude.toString() : null;
    if (dto.addressLine1 !== undefined) profile.addressLine1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined) profile.addressLine2 = dto.addressLine2;
    if (dto.addressLine3 !== undefined) profile.addressLine3 = dto.addressLine3;
    if (dto.postTown !== undefined) profile.postTown = dto.postTown;
    if (dto.postcode !== undefined) profile.postcode = dto.postcode;
    if (dto.uprn !== undefined) profile.uprn = dto.uprn;

    return this.vendorRepo.save(profile);
  }

  async updateProfile(
    vendorId: string,
    dto: UpdateVendorDto,
  ): Promise<VendorProfile> {
    const profile = await this.findById(vendorId);
    if (dto.companyName !== undefined) profile.companyName = dto.companyName;

    // Address updates (for vendor self-update)
    if (dto.latitude !== undefined)
      profile.latitude = dto.latitude !== null ? dto.latitude.toString() : null;
    if (dto.longitude !== undefined)
      profile.longitude =
        dto.longitude !== null ? dto.longitude.toString() : null;
    if (dto.addressLine1 !== undefined) profile.addressLine1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined) profile.addressLine2 = dto.addressLine2;
    if (dto.addressLine3 !== undefined) profile.addressLine3 = dto.addressLine3;
    if (dto.postTown !== undefined) profile.postTown = dto.postTown;
    if (dto.postcode !== undefined) profile.postcode = dto.postcode;
    if (dto.uprn !== undefined) profile.uprn = dto.uprn;

    return this.vendorRepo.save(profile);
  }

  @OnEvent('user.password.changed')
  async handleUserPasswordChanged(payload: { userId: string; role: string }) {
    if (payload.role === UserRole.VENDOR) {
      await this.activateVendor(payload.userId);
    }
  }

  async activateVendor(vendorId: string): Promise<void> {
    const profile = await this.findById(vendorId);
    if (profile.approvalStatus === VendorApprovalStatus.PENDING) {
      profile.approvalStatus = VendorApprovalStatus.ACTIVE;
      await this.vendorRepo.save(profile);
      this.logger.log(
        `Vendor ${vendorId} activated automatically after password change`,
      );
    }
  }

  // Financials placeholder for Admin
  async getVendorFinancials(vendorId: string) {
    const _profile = await this.findById(vendorId);
    // Here we can sum up completed bookings. This will be implemented fully once we have bookings context.
    return {
      vendorId,
      totalSales: 0,
      totalBookings: 0,
    };
  }

  async findNearbyVendors(
    latitude: number,
    longitude: number,
    radiusKm: number = 50,
  ): Promise<VendorProfile[]> {
    const activeVendors = await this.vendorRepo.find({
      where: { approvalStatus: VendorApprovalStatus.ACTIVE },
      relations: ['user'],
    });

    const toRad = (value: number) => (value * Math.PI) / 180;

    const withDistance = activeVendors
      .filter((v) => v.latitude != null && v.longitude != null)
      .map((v) => {
        const vLat = parseFloat(v.latitude as string);
        const vLon = parseFloat(v.longitude as string);

        const R = 6371; // km
        const dLat = toRad(vLat - latitude);
        const dLon = toRad(vLon - longitude);
        const lat1 = toRad(latitude);
        const lat2 = toRad(vLat);

        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.sin(dLon / 2) *
            Math.sin(dLon / 2) *
            Math.cos(lat1) *
            Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return { ...v, distance };
      })
      .filter((v) => v.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    return withDistance;
  }
}
