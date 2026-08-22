import { BookingStatus, type BookingResponse } from "@nexa/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, Clock, User, MapPin, Camera, Star, XCircle, Edit, X } from "lucide-react";
import { api } from "../lib/api-client";
import { describeError } from "../lib/errors";
const STEP_ORDER: BookingStatus[] = [
  BookingStatus.BOOKED,
  BookingStatus.ASSIGNED,
  BookingStatus.ACCEPTED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
];

const STEP_LABELS: Record<string, string> = {
  [BookingStatus.BOOKED]: "Booked",
  [BookingStatus.ASSIGNED]: "Assigned",
  [BookingStatus.ACCEPTED]: "Accepted",
  [BookingStatus.IN_PROGRESS]: "In Progress",
  [BookingStatus.COMPLETED]: "Completed",
};

function formatWhen(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const BookingStatusPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: booking, isLoading } = useQuery<BookingResponse>({
    queryKey: ["booking", id],
    queryFn: async () => {
      const { data } = await api.get<BookingResponse>(`/bookings/${id}`);
      return data;
    },
    enabled: !!id,
  });

  const currentIndex = booking ? STEP_ORDER.indexOf(booking.status as BookingStatus) : -1;
  const cancelled = booking?.status === BookingStatus.CANCELLED;
  const canCancel = booking?.status === BookingStatus.BOOKED || booking?.status === BookingStatus.ACCEPTED;
  const canEdit = booking?.status === BookingStatus.BOOKED || booking?.status === BookingStatus.ACCEPTED;

  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editBookingTime, setEditBookingTime] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const openEditModal = () => {
    if (!booking) return;
    const dt = booking.bookingTime ? new Date(booking.bookingTime) : new Date();
    const tzOffset = dt.getTimezoneOffset() * 60000;
    const localIso = new Date(dt.getTime() - tzOffset).toISOString().slice(0, 16);
    setEditBookingTime(localIso);
    setEditAddress(booking.serviceAddress || "");
    setUpdateError(null);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!booking) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      if (!editBookingTime) throw new Error("Please select a date and time");
      if (!editAddress.trim()) throw new Error("Please enter a service address");

      await api.patch(`/bookings/${booking.bookingId}`, {
        bookingTime: new Date(editBookingTime).toISOString(),
        serviceAddress: editAddress.trim(),
      });
      setShowEditModal(false);
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
    } catch (err) {
      setUpdateError(describeError(err));
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await api.delete(`/bookings/${booking.bookingId}`);
      setShowCancelConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
    } catch (err) {
      setCancelError(describeError(err));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-2xl font-bold">Booking Status</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your service in real-time</p>
      </motion.div>

      {isLoading ? (
        <div className="glass-card p-5 text-sm text-muted-foreground">Loading booking…</div>
      ) : !booking ? (
        <div className="glass-card p-5 text-sm text-muted-foreground">Booking not found.</div>
      ) : (
        <>
          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-5"
          >
            {cancelled && (
              <p className="mb-3 text-sm font-medium text-destructive">This booking was cancelled.</p>
            )}
            <div className="space-y-0">
              {STEP_ORDER.map((step, i) => {
                const done = !cancelled && i < currentIndex;
                const active = !cancelled && i === currentIndex;
                return (
                  <div key={step} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                          done
                            ? "bg-primary text-primary-foreground"
                            : active
                            ? "bg-primary/20 border-2 border-primary text-primary"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {done ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                      </div>
                      {i < STEP_ORDER.length - 1 && (
                        <div className={`w-0.5 h-8 ${done ? "bg-primary" : "bg-border"}`} />
                      )}
                    </div>
                    <div className="pt-1">
                      <p
                        className={`text-sm font-medium ${
                          active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {STEP_LABELS[step]}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Vendor Info */}
          {booking.vendorName ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-4 flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{booking.vendorName || "Certified Detailer"}</p>
                <p className="text-xs text-muted-foreground">Assigned Vendor</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-4 flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Awaiting Match</p>
                <p className="text-xs text-muted-foreground">Finding a detailer for you</p>
              </div>
            </motion.div>
          )}

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card p-4 space-y-2 text-sm"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{formatWhen(booking.bookingTime)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{booking.serviceAddress}</span>
            </div>
          </motion.div>

          {/* Payment Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className={`glass-card p-4 flex items-center justify-between gap-3 border ${
              booking.paymentStatus === 'captured'
                ? 'border-success/30 bg-success/5'
                : booking.paymentStatus === 'refunded'
                ? 'border-purple-500/30 bg-purple-500/5'
                : 'border-warning/30 bg-warning/5'
            }`}
          >
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Payment Status</p>
              <p className="text-sm font-semibold">
                {booking.paymentStatus === 'captured'
                  ? `Paid in Full · £${booking.price}`
                  : booking.paymentStatus === 'refunded'
                  ? `Refunded · £${booking.price}`
                  : `Payment Pending · £${booking.price}`}
              </p>
            </div>

            {booking.paymentStatus !== 'captured' && booking.paymentStatus !== 'refunded' && !cancelled && (
              <Button
                size="sm"
                className="bg-primary text-primary-foreground font-semibold shadow-md"
                onClick={() => navigate('/payment', { state: { bookingId: booking.bookingId } })}
              >
                Pay Now
              </Button>
            )}
          </motion.div>

          {/* Actions */}
          <div className="flex gap-3">
            {canEdit && (
              <Button
                variant="outline"
                className="flex-1 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                onClick={openEditModal}
              >
                <Edit className="h-4 w-4" /> Edit Booking
              </Button>
            )}
            <Button
              variant="secondary"
              className="flex-1 gap-1.5"
              onClick={() => navigate(`/bookings/photos/${booking.bookingId}`)}
            >
              <Camera className="h-4 w-4" /> Photos
            </Button>
            <Button
              variant="secondary"
              className="flex-1 gap-1.5"
              onClick={() => navigate(`/bookings/review/${booking.bookingId}`)}
            >
              <Star className="h-4 w-4" /> Review
            </Button>
          </div>

          {/* Cancel booking */}
          {canCancel && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              {showCancelConfirm ? (
                <div className="glass-card p-5 space-y-3 border border-destructive/30">
                  <p className="text-sm font-medium text-destructive">Are you sure you want to cancel this booking?</p>
                  <p className="text-xs text-muted-foreground">
                    Cancellations made more than 24 hours before your appointment are eligible for a full refund.
                    Late cancellations may be subject to a 30% retention fee.
                    View our full <Link to="/cancellation-policy" target="_blank" className="text-primary hover:underline font-semibold">Cancellation Policy</Link> for details.
                  </p>
                  {cancelError && (
                    <p className="text-xs text-destructive">{cancelError}</p>
                  )}
                  <div className="flex gap-3">
                    <Button
                      variant="destructive"
                      className="flex-1 gap-1.5"
                      onClick={handleCancel}
                      disabled={cancelling}
                    >
                      <XCircle className="h-4 w-4" />
                      {cancelling ? "Cancelling…" : "Yes, Cancel Booking"}
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setShowCancelConfirm(false)}
                      disabled={cancelling}
                    >
                      Go Back
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setShowCancelConfirm(true)}
                >
                  <XCircle className="h-4 w-4" /> Cancel Booking
                </Button>
              )}
            </motion.div>
          )}
        </>
      )}

      {/* CUSTOMER EDIT BOOKING MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-md p-6 space-y-5 bg-card border border-border"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
                <Edit className="w-5 h-5 text-primary" />
                Edit Booking Details
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  New Wash Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={editBookingTime}
                  onChange={(e) => setEditBookingTime(e.target.value)}
                  className="w-full bg-secondary border border-border text-foreground rounded-xl p-3 text-sm focus:border-primary focus:ring-0"
                />
                <p className="text-xs text-muted-foreground">
                  Must be scheduled at least 48 hours in advance.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Service Address
                </label>
                <textarea
                  rows={3}
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-secondary border border-border text-foreground rounded-xl p-3 text-sm focus:border-primary focus:ring-0 resize-none"
                />
              </div>

              {updateError && (
                <p className="text-xs text-destructive">{updateError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={updating}
                onClick={handleSaveEdit}
              >
                {updating ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BookingStatusPage;
