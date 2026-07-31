import { Test, TestingModule } from '@nestjs/testing';
import { MessageTemplateService } from './message-template.service';
import { SettingsService } from '../settings/settings.service';

describe('MessageTemplateService', () => {
  let service: MessageTemplateService;
  let settingsService: Partial<SettingsService>;

  beforeEach(async () => {
    settingsService = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageTemplateService,
        { provide: SettingsService, useValue: settingsService },
      ],
    }).compile();

    service = module.get<MessageTemplateService>(MessageTemplateService);
  });

  describe('buildEmail', () => {
    it('should render HTML email containing the correct legal company name in the footer', () => {
      const template = {
        title: 'Welcome to NEXA',
        emailBody: 'Hi {{userName}}, welcome to NEXA!',
        smsBody: 'Welcome!',
      };

      const result = service.buildEmail(template, { userName: 'John' });
      const currentYear = new Date().getFullYear();

      expect(result.subject).toBe('NEXA — Welcome to NEXA');
      expect(result.html).toContain(
        `© ${currentYear} NEXA Autocare Technologies Ltd. Aberdeen, Scotland.`,
      );
    });
  });
});
