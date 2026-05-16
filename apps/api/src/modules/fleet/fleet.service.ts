import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FleetInquiry } from '../../database/entities/fleet-inquiry.entity';

@Injectable()
export class FleetService {
  constructor(
    @InjectRepository(FleetInquiry)
    private readonly fleetRepo: Repository<FleetInquiry>,
  ) {}

  async createInquiry(dto: Partial<FleetInquiry>): Promise<FleetInquiry> {
    const inquiry = this.fleetRepo.create(dto);
    return await this.fleetRepo.save(inquiry);
  }

  async getAllInquiries(): Promise<FleetInquiry[]> {
    return await this.fleetRepo.find({ order: { createdAt: 'DESC' } });
  }
}
