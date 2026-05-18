import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Star, Send } from "lucide-react";

const ReviewPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  const handleSubmit = () => {
    // TODO(api): POST the review to a reviews endpoint once it exists.
    toast({
      title: "Thanks for your feedback!",
      description: "Your review has been recorded.",
    });
    navigate("/bookings");
  };

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-2xl font-bold">Rate Service</h1>
        <p className="text-sm text-muted-foreground mt-1">How was your experience?</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex justify-center gap-2 py-4"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110">
            <Star
              className={`h-10 w-10 transition-colors ${
                star <= rating ? "fill-primary text-primary" : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </motion.div>

      {rating > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-muted-foreground"
        >
          {rating <= 2 ? "We're sorry to hear that" : rating <= 4 ? "Thanks for your feedback!" : "Excellent! Glad you loved it!"}
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <textarea
          placeholder="Tell us about your experience..."
          value={review}
          onChange={(e) => setReview(e.target.value)}
          className="w-full h-32 rounded-xl bg-secondary border border-border p-4 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </motion.div>

      <Button
        variant="hero"
        className="w-full h-12"
        disabled={rating === 0}
        onClick={handleSubmit}
      >
        <Send className="h-4 w-4" /> Submit Review
      </Button>
    </div>
  );
};

export default ReviewPage;
