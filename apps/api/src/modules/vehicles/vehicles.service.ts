import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { VehicleResponse } from '@nexa/shared';
import { Repository } from 'typeorm';
import { Vehicle } from '../../database/entities';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
  ) {}

  async create(ownerId: string, dto: CreateVehicleDto): Promise<Vehicle> {
    const vehicle = this.vehicleRepo.create({
      ownerId,
      registrationNumber: dto.registrationNumber.toUpperCase().replace(/\s/g, ''),
      make: dto.make.trim(),
      model: dto.model.trim(),
      vehicleType: dto.vehicleType,
      colour: dto.colour?.trim() || null,
    });
    return this.vehicleRepo.save(vehicle);
  }

  async findAllByOwner(ownerId: string): Promise<Vehicle[]> {
    return this.vehicleRepo.find({
      where: { ownerId },
      order: { createdOn: 'DESC' },
    });
  }

  async findAllForAdmin(): Promise<Vehicle[]> {
    return this.vehicleRepo.find({
      relations: ['owner'],
      order: { createdOn: 'DESC' },
    });
  }

  async findById(vehicleId: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepo.findOne({ where: { vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async findByIdForOwner(vehicleId: string, ownerId: string): Promise<Vehicle> {
    const vehicle = await this.findById(vehicleId);
    if (vehicle.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this vehicle');
    }
    return vehicle;
  }

  async update(
    vehicleId: string,
    ownerId: string,
    dto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    const vehicle = await this.findByIdForOwner(vehicleId, ownerId);

    if (dto.registrationNumber !== undefined) {
      vehicle.registrationNumber = dto.registrationNumber.toUpperCase().replace(/\s/g, '');
    }
    if (dto.make !== undefined) vehicle.make = dto.make.trim();
    if (dto.model !== undefined) vehicle.model = dto.model.trim();
    if (dto.vehicleType !== undefined) vehicle.vehicleType = dto.vehicleType;
    if (dto.colour !== undefined) vehicle.colour = dto.colour?.trim() || null;

    return this.vehicleRepo.save(vehicle);
  }

  async remove(vehicleId: string, ownerId: string): Promise<void> {
    const vehicle = await this.findByIdForOwner(vehicleId, ownerId);
    await this.vehicleRepo.remove(vehicle);
  }

  toResponse(vehicle: Vehicle): VehicleResponse {
    return {
      vehicleId: vehicle.vehicleId,
      registrationNumber: vehicle.registrationNumber,
      make: vehicle.make,
      model: vehicle.model,
      vehicleType: vehicle.vehicleType,
      colour: vehicle.colour,
      createdAt: vehicle.createdOn.toISOString(),
    };
  }
}
