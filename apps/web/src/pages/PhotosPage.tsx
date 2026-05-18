import { motion } from "framer-motion";
import { Camera } from "lucide-react";

// TODO(api): replace placeholders with real job photos once the photos endpoint exists.
const placeholderPhotos = {
  before: [1, 2],
  after: [1, 2],
};

const PhotosPage = () => {
  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-heading text-2xl font-bold">Photos</h1>
        <p className="text-sm text-muted-foreground mt-1">Before & after your service</p>
      </motion.div>

      {(["before", "after"] as const).map((type) => (
        <motion.div
          key={type}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: type === "after" ? 0.15 : 0.1 }}
        >
          <h2 className="font-heading font-semibold capitalize mb-3">{type} Photos</h2>
          <div className="grid grid-cols-2 gap-3">
            {placeholderPhotos[type].map((_, i) => (
              <div
                key={i}
                className="glass-card aspect-square flex flex-col items-center justify-center gap-2"
              >
                <Camera className="h-8 w-8 text-muted-foreground/50" />
                <span className="text-[10px] text-muted-foreground">
                  {type === "before" ? "Before" : "After"} #{i + 1}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default PhotosPage;
