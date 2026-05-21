export interface UpdateUserAdminDto {
  role?: string;
  stripeAccountId?: string | null;
  displayName?: string;
}

export interface AssignVendorDto {
  vendorId: string;
}

export interface SystemSettingResponse {
  key: string;
  value: string;
}

export interface SaveSystemSettingDto {
  value: string;
}
