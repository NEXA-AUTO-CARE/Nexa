import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { AddonResponse } from '@nexa/shared';
import { Repository } from 'typeorm';
import { ServiceAddon } from '../../database/entities/service-addon.entity';
import { CreateAddonDto, UpdateAddonDto } from './dto/addon.dto';

@Injectable()
export class AddonsService {
  constructor(
    @InjectRepository(ServiceAddon)
    private readonly addonRepo: Repository<ServiceAddon>,
  ) {}

  async findAll(onlyActive = true): Promise<AddonResponse[]> {
    const where = onlyActive ? { isActive: true } : {};
    const addons = await this.addonRepo.find({ where, order: { name: 'ASC' } });
    return addons.map(this.toResponse);
  }

  async findById(id: string): Promise<AddonResponse> {
    const addon = await this.addonRepo.findOne({ where: { addonId: id } });
    if (!addon) throw new NotFoundException('Addon not found');
    return this.toResponse(addon);
  }

  async create(dto: CreateAddonDto): Promise<AddonResponse> {
    const addon = this.addonRepo.create(dto);
    await this.addonRepo.save(addon);
    return this.toResponse(addon);
  }

  async update(id: string, dto: UpdateAddonDto): Promise<AddonResponse> {
    const addon = await this.addonRepo.findOne({ where: { addonId: id } });
    if (!addon) throw new NotFoundException('Addon not found');

    Object.assign(addon, dto);
    await this.addonRepo.save(addon);
    return this.toResponse(addon);
  }

  async delete(id: string): Promise<void> {
    const addon = await this.addonRepo.findOne({ where: { addonId: id } });
    if (!addon) throw new NotFoundException('Addon not found');

    // We might want to soft delete instead of hard delete, 
    // but setting isActive to false is our "soft delete" equivalent here if we want to keep it.
    await this.addonRepo.remove(addon);
  }

  private toResponse(addon: ServiceAddon): AddonResponse {
    return {
      addonId: addon.addonId,
      name: addon.name,
      description: addon.description,
      price: addon.price,
      isActive: addon.isActive,
      createdAt: addon.createdAt,
      updatedAt: addon.updatedAt,
    };
  }
}
