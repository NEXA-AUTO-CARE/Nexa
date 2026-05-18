import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Plus, Trash2, ArrowLeft, Smartphone } from "lucide-react";
import { mockSavedCards, type MockSavedCard } from "@/lib/mock";

// TODO(api): this whole screen is mock — wire to a saved-payment-methods endpoint when it exists.
const PaymentMethodsPage = () => {
  const navigate = useNavigate();
  const [showAddCard, setShowAddCard] = useState(false);
  const [applePay, setApplePay] = useState(false);
  const [googlePay, setGooglePay] = useState(false);
  const [cards, setCards] = useState<MockSavedCard[]>(mockSavedCards);
  const [newCard, setNewCard] = useState({ number: "", expiry: "", cvc: "", name: "" });

  const handleAddCard = () => {
    if (!newCard.number || !newCard.expiry || !newCard.cvc || !newCard.name) return;
    const last4 = newCard.number.replace(/\s/g, "").slice(-4);
    setCards((prev) => [
      ...prev,
      { id: Date.now().toString(), last4, brand: "Card", expiry: newCard.expiry, isDefault: false },
    ]);
    setNewCard({ number: "", expiry: "", cvc: "", name: "" });
    setShowAddCard(false);
  };

  const handleDelete = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSetDefault = (id: string) => {
    setCards((prev) => prev.map((c) => ({ ...c, isDefault: c.id === id })));
  };

  return (
    <div className="px-4 pt-12 pb-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <button onClick={() => navigate("/profile")} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-heading text-2xl font-bold">Manage Payments</h1>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Saved Cards</h2>
        {cards.map((card) => (
          <div key={card.id} className="glass-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{card.brand} ending in {card.last4}</p>
              <p className="text-xs text-muted-foreground">Expires {card.expiry}</p>
            </div>
            {card.isDefault ? (
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">Default</span>
            ) : (
              <button onClick={() => handleSetDefault(card.id)} className="text-xs text-primary font-medium">
                Set Default
              </button>
            )}
            <button onClick={() => handleDelete(card.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {!showAddCard ? (
          <Button variant="outline" className="w-full gap-2" onClick={() => setShowAddCard(true)}>
            <Plus className="h-4 w-4" /> Add New Card
          </Button>
        ) : (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass-card p-4 space-y-3">
            <h3 className="font-heading font-semibold text-sm">Add Card</h3>
            <Input placeholder="Cardholder Name" value={newCard.name} onChange={(e) => setNewCard((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Card Number" value={newCard.number} onChange={(e) => setNewCard((p) => ({ ...p, number: e.target.value }))} />
            <div className="flex gap-3">
              <Input placeholder="MM/YY" value={newCard.expiry} onChange={(e) => setNewCard((p) => ({ ...p, expiry: e.target.value }))} />
              <Input placeholder="CVC" value={newCard.cvc} onChange={(e) => setNewCard((p) => ({ ...p, cvc: e.target.value }))} type="password" />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleAddCard}>Save Card</Button>
              <Button variant="outline" onClick={() => setShowAddCard(false)}>Cancel</Button>
            </div>
          </motion.div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Digital Wallets</h2>
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Apple Pay</p>
                <p className="text-xs text-muted-foreground">Pay with Face ID or Touch ID</p>
              </div>
            </div>
            <Switch checked={applePay} onCheckedChange={setApplePay} />
          </div>
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Google Pay</p>
                <p className="text-xs text-muted-foreground">Fast checkout with Google</p>
              </div>
            </div>
            <Switch checked={googlePay} onCheckedChange={setGooglePay} />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentMethodsPage;
