import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Gift } from "lucide-react";

export interface GiftRecipientData {
  fullName: string;
  email: string;
  telephone: string;
  address: string;
}

interface GiftRecipientFieldsProps {
  data: GiftRecipientData;
  onChange: (data: GiftRecipientData) => void;
  disabled?: boolean;
}

const inputClass = "h-11 bg-secondary border-border text-foreground placeholder:text-muted-foreground";

const GiftRecipientFields = ({ data, onChange, disabled = false }: GiftRecipientFieldsProps) => {
  const update = (field: keyof GiftRecipientData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className={`glass-card p-4 space-y-3 transition-opacity ${disabled ? "opacity-40 pointer-events-none" : "border-primary/20"}`}>
      <div className="flex items-center gap-2 mb-1">
        <Gift className="h-4 w-4 text-primary" />
        <p className="text-xs font-heading font-semibold text-primary uppercase tracking-wider">
          Recipient Details
        </p>
      </div>
      {disabled && (
        <p className="text-xs text-muted-foreground -mt-1">
          These fields are only active when gifting a wash to a friend.
        </p>
      )}
      <Input
        placeholder="Recipient's Full Name *"
        value={data.fullName}
        onChange={(e) => update("fullName", e.target.value)}
        className={inputClass}
        disabled={disabled}
      />
      <Input
        placeholder="Recipient's Email Address *"
        value={data.email}
        onChange={(e) => update("email", e.target.value)}
        className={inputClass}
        type="email"
        disabled={disabled}
      />
      <Input
        placeholder="Telephone Number *"
        value={data.telephone}
        onChange={(e) => update("telephone", e.target.value)}
        className={inputClass}
        type="tel"
        disabled={disabled}
      />
      <Textarea
        placeholder="Delivery Address *"
        value={data.address}
        onChange={(e) => update("address", e.target.value)}
        className="bg-secondary border-border text-foreground placeholder:text-muted-foreground min-h-[70px]"
        disabled={disabled}
      />
    </div>
  );
};

export default GiftRecipientFields;
