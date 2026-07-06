import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CorporateFleetEnquiryResponse } from '@nexa/shared';
import { Repository } from 'typeorm';
import { CorporateFleetEnquiry } from '../../database/entities';
import { CreateCorporateFleetEnquiryDto } from './dto/corporate.dto';

export const CORPORATE_ENQUIRY_CREATED = 'corporate.enquiry.created';

@Injectable()
export class CorporateService {
  constructor(
    @InjectRepository(CorporateFleetEnquiry)
    private readonly repo: Repository<CorporateFleetEnquiry>,
    private readonly events: EventEmitter2,
  ) {}

  async create(
    dto: CreateCorporateFleetEnquiryDto,
  ): Promise<CorporateFleetEnquiryResponse> {
    const enquiry = this.repo.create({ ...dto, status: 'new' });
    const saved = await this.repo.save(enquiry);
    // Admin picks these up to raise an invoice for the company.
    this.events.emit(CORPORATE_ENQUIRY_CREATED, saved);
    return this.toResponse(saved);
  }

  async findAll(): Promise<CorporateFleetEnquiryResponse[]> {
    const list = await this.repo.find({ order: { createdOn: 'DESC' } });
    return list.map((e) => this.toResponse(e));
  }

  async markInvoiced(id: string): Promise<CorporateFleetEnquiryResponse> {
    const enquiry = await this.repo.findOne({ where: { enquiryId: id } });
    if (!enquiry) throw new NotFoundException('Enquiry not found');
    enquiry.status = 'invoiced';
    await this.repo.save(enquiry);
    return this.toResponse(enquiry);
  }

  async deleteEnquiry(id: string): Promise<void> {
    const enquiry = await this.repo.findOne({ where: { enquiryId: id } });
    if (!enquiry) throw new NotFoundException('Enquiry not found');
    await this.repo.remove(enquiry);
  }

  private toResponse(e: CorporateFleetEnquiry): CorporateFleetEnquiryResponse {
    return {
      enquiryId: e.enquiryId,
      companyName: e.companyName,
      fleetSize: e.fleetSize,
      contactPerson: e.contactPerson,
      businessEmail: e.businessEmail,
      businessPhone: e.businessPhone,
      status: e.status,
      createdAt: e.createdOn.toISOString(),
    };
  }
}
