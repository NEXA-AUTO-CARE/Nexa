import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Building2 } from "lucide-react";
import { isValidPhoneNumber, sanitizePhoneInput } from "@nexa/shared";

export interface CorporateFleetData {
  companyName: string;
  fleetSize: string;
  contactPerson: string;
  businessEmail: string;
  businessPhone: string;
}

interface CorporateFleetFieldsProps {
  data: CorporateFleetData;
  onChange: (data: CorporateFleetData) => void;
}

const inputClass = "h-11 bg-secondary border-border text-foreground placeholder:text-muted-foreground";

const CorporateFleetFields = ({ data, onChange }: CorporateFleetFieldsProps) => {
  const update = (field: keyof CorporateFleetData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const phoneTrimmed = data.businessPhone.trim();
  const phoneInvalid = phoneTrimmed.length > 0 && !isValidPhoneNumber(phoneTrimmed);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="glass-card p-4 space-y-3 border-primary/20">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-4 w-4 text-primary" />
          <p className="text-xs font-heading font-semibold text-primary uppercase tracking-wider">
            Business Details
          </p>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          Book a wash for 1 or more vehicles. Invoicing and scheduling are handled directly by our finance team.
        </p>

        <Input
          placeholder="Company Name *"
          value={data.companyName}
          onChange={(e) => update("companyName", e.target.value)}
          className={inputClass}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="No. of Vehicles (1+) *"
            value={data.fleetSize}
            onChange={(e) => update("fleetSize", e.target.value)}
            className={inputClass}
            type="number"
            min="1"
          />
          <Input
            placeholder="Contact Person *"
            value={data.contactPerson}
            onChange={(e) => update("contactPerson", e.target.value)}
            className={inputClass}
          />
        </div>
        <Input
          placeholder="Business Email *"
          value={data.businessEmail}
          onChange={(e) => update("businessEmail", e.target.value)}
          className={inputClass}
          type="email"
        />
        <div className="space-y-1">
          <Input
            placeholder="Business Phone * (e.g. +44 1224 000000)"
            value={data.businessPhone}
            onChange={(e) => update("businessPhone", sanitizePhoneInput(e.target.value))}
            className={`${inputClass} ${phoneInvalid ? "border-destructive focus-visible:ring-destructive" : ""}`}
            type="tel"
            inputMode="tel"
          />
          {phoneInvalid && (
            <p className="text-xs text-destructive">
              Please enter a valid phone number (7–15 digits, e.g. +447700900077 or 01224000000).
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default CorporateFleetFields;
