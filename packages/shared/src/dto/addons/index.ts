export interface CreateAddonDto {
  name: string;
  description?: string;
  price: string;
  isActive?: boolean;
}

export interface UpdateAddonDto {
  name?: string;
  description?: string;
  price?: string;
  isActive?: boolean;
}

export interface AddonResponse {
  addonId: string;
  name: string;
  description: string | null;
  price: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
