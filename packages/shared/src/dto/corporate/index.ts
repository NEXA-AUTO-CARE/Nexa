export interface CreateCorporateFleetEnquiryDto {
  companyName: string;
  fleetSize: number;
  contactPerson: string;
  businessEmail: string;
  businessPhone: string;
}

export type CorporateFleetStatus = 'new' | 'invoiced';

export interface CorporateFleetEnquiryResponse {
  enquiryId: string;
  companyName: string;
  fleetSize: number;
  contactPerson: string;
  businessEmail: string;
  businessPhone: string;
  status: CorporateFleetStatus;
  createdAt: string;
}
