import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../../database/entities/system-setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly repo: Repository<SystemSetting>,
  ) {}

  async findOne(key: string): Promise<SystemSetting | null> {
    return this.repo.findOne({ where: { key } });
  }

  async saveSetting(key: string, value: string): Promise<SystemSetting> {
    let setting = await this.repo.findOne({ where: { key } });
    if (setting) {
      setting.value = value;
      setting.updatedOn = new Date();
    } else {
      setting = this.repo.create({ key, value });
    }
    return this.repo.save(setting);
  }

  async findAll(): Promise<SystemSetting[]> {
    return this.repo.find();
  }
}
