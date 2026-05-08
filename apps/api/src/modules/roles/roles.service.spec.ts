import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Role, RolePermission, User } from '../../database/entities';
import { RolesService } from './roles.service';

function makeRepo() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((x) => x),
    remove: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
}

function customRole(overrides: Partial<Role> = {}): Role {
  return {
    roleId: 'r-custom',
    name: 'support_agent',
    description: null,
    isSystem: false,
    rolePermissions: [],
    users: [],
    createdOn: new Date(),
    createdBy: null,
    updatedOn: null,
    updatedBy: null,
    approvedOn: null,
    approvedBy: null,
    ...overrides,
  } as Role;
}

function systemRole(name = 'admin'): Role {
  return customRole({ roleId: `r-${name}`, name, isSystem: true });
}

describe('RolesService', () => {
  let roleRepo: ReturnType<typeof makeRepo>;
  let rpRepo: ReturnType<typeof makeRepo>;
  let userRepo: ReturnType<typeof makeRepo>;
  let service: RolesService;

  beforeEach(() => {
    roleRepo = makeRepo();
    rpRepo = makeRepo();
    userRepo = makeRepo();
    service = new RolesService(roleRepo as never, rpRepo as never, userRepo as never);
  });

  describe('lookups', () => {
    it('findByName returns null when missing', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      await expect(service.findByName('nope')).resolves.toBeNull();
    });

    it('findByNameOrFail throws NotFoundException when missing', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      await expect(service.findByNameOrFail('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('findById throws when role not found', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('r-x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('listPermissions maps RolePermission rows to permission strings', async () => {
      rpRepo.find.mockResolvedValue([
        { permission: 'users:read.self' },
        { permission: 'bookings:create' },
      ] as RolePermission[]);
      await expect(service.listPermissions('r-1')).resolves.toEqual([
        'users:read.self',
        'bookings:create',
      ]);
    });
  });

  describe('create', () => {
    it('normalises the role name to lowercase + underscores', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      roleRepo.save.mockImplementation(async (e) => e);
      const result = await service.create({ name: 'Support Agent', description: 't1' });
      expect(roleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'support_agent', description: 't1', isSystem: false }),
      );
      expect(result.name).toBe('support_agent');
    });

    it('rejects names that do not match the validator', async () => {
      await expect(service.create({ name: '1bad' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.create({ name: '!!' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws Conflict if a role with that name already exists', async () => {
      roleRepo.findOne.mockResolvedValue(customRole({ name: 'support_agent' }));
      await expect(service.create({ name: 'support_agent' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('rename', () => {
    it('refuses to rename system roles', async () => {
      roleRepo.findOne.mockResolvedValue(systemRole('customer'));
      await expect(
        service.rename('r-customer', 'something_else'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('renames a custom role and writes the new description', async () => {
      const role = customRole({ name: 'support_agent', description: 'old' });
      roleRepo.findOne
        .mockResolvedValueOnce(role)         // findById
        .mockResolvedValueOnce(null);        // findByName for clash check
      roleRepo.save.mockImplementation(async (r) => r);
      const updated = await service.rename(role.roleId, 'support_lead', 'new');
      expect(updated.name).toBe('support_lead');
      expect(updated.description).toBe('new');
    });

    it('rejects rename if the new name already exists on a different role', async () => {
      const role = customRole({ roleId: 'r-1', name: 'support_agent' });
      roleRepo.findOne
        .mockResolvedValueOnce(role)
        .mockResolvedValueOnce(customRole({ roleId: 'r-other', name: 'support_lead' }));
      await expect(
        service.rename(role.roleId, 'support_lead'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('delete', () => {
    it('refuses to delete system roles', async () => {
      roleRepo.findOne.mockResolvedValue(systemRole('admin'));
      await expect(service.delete('r-admin')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses to delete a role with users still assigned', async () => {
      roleRepo.findOne.mockResolvedValue(customRole());
      userRepo.count.mockResolvedValue(3);
      await expect(service.delete('r-custom')).rejects.toBeInstanceOf(ConflictException);
    });

    it('deletes a custom unused role', async () => {
      const role = customRole();
      roleRepo.findOne.mockResolvedValue(role);
      userRepo.count.mockResolvedValue(0);
      await service.delete('r-custom');
      expect(roleRepo.remove).toHaveBeenCalledWith(role);
    });
  });

  describe('setPermissions', () => {
    it('rejects unknown permission codes', async () => {
      roleRepo.findOne.mockResolvedValue(customRole());
      await expect(
        service.setPermissions('r-custom', ['definitely:fake' as never]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('inserts new permissions and removes ones not in the set', async () => {
      roleRepo.findOne.mockResolvedValue(customRole());
      rpRepo.find
        .mockResolvedValueOnce([
          { rolePermissionId: 'rp-1', roleId: 'r-custom', permission: 'users:read.self' },
          { rolePermissionId: 'rp-2', roleId: 'r-custom', permission: 'bookings:create' },
        ] as RolePermission[])
        .mockResolvedValueOnce([
          { permission: 'users:read.self' },
          { permission: 'reviews:read' },
        ] as RolePermission[]);
      rpRepo.save.mockResolvedValue([]);
      rpRepo.delete.mockResolvedValue({});

      const result = await service.setPermissions('r-custom', [
        'users:read.self',
        'reviews:read',
      ] as never);

      expect(rpRepo.save).toHaveBeenCalledWith([
        expect.objectContaining({ roleId: 'r-custom', permission: 'reviews:read' }),
      ]);
      expect(rpRepo.delete).toHaveBeenCalledWith(
        expect.objectContaining({ rolePermissionId: expect.anything() }),
      );
      expect(result).toEqual(['users:read.self', 'reviews:read']);
    });

    it('makes no DB writes when the desired set already matches', async () => {
      roleRepo.findOne.mockResolvedValue(customRole());
      rpRepo.find
        .mockResolvedValueOnce([
          { rolePermissionId: 'rp-1', roleId: 'r-custom', permission: 'users:read.self' },
        ] as RolePermission[])
        .mockResolvedValueOnce([{ permission: 'users:read.self' }] as RolePermission[]);
      await service.setPermissions('r-custom', ['users:read.self'] as never);
      expect(rpRepo.save).not.toHaveBeenCalled();
      expect(rpRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('assignRoleToUser', () => {
    it('throws NotFound when the user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.assignRoleToUser('u-x', 'r-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws NotFound when the role does not exist', async () => {
      userRepo.findOne.mockResolvedValue({ userId: 'u-1' });
      roleRepo.findOne.mockResolvedValue(null);
      await expect(service.assignRoleToUser('u-1', 'r-x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('reassigns the user to the given role and saves', async () => {
      const user = { userId: 'u-1', roleId: 'r-old' } as User;
      userRepo.findOne.mockResolvedValue(user);
      roleRepo.findOne.mockResolvedValue(customRole({ roleId: 'r-new' }));
      userRepo.save.mockImplementation(async (e) => e);
      const result = await service.assignRoleToUser('u-1', 'r-new');
      expect(result.roleId).toBe('r-new');
      expect(userRepo.save).toHaveBeenCalledWith(user);
    });
  });
});
