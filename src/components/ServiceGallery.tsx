import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

export interface GalleryItem {
  id: string;
  service_slug: string;
  before_url: string;
  after_url: string;
  caption: string | null;
  sort_order: number;
}

export const useServiceGallery = (slug?: string) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    if (!slug) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("service_gallery")
      .select("*")
      .eq("service_slug", slug)
      .order("sort_order", { ascending: true });
    setItems((data as GalleryItem[]) || []);
    setLoading(false);
  };
  useEffect(() => { reload(); }, [slug]);
  return { items, setItems, loading, reload };
};

const Photo = ({ src, label, variant }: { src: string; label: string; variant: "before" | "after" }) => (
  <div className="relative aspect-square overflow-hidden bg-muted">
    <img src={src} alt={label} loading="lazy" width={720} height={720} className="w-full h-full object-cover" />
    <span
      className={`absolute top-2 left-2 sm:top-3 sm:left-3 px-2.5 sm:px-3 py-1 rounded-full font-body text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] ${
        variant === "before" ? "bg-background/90 text-foreground" : "bg-primary text-primary-foreground"
      }`}
    >
      {label}
    </span>
  </div>
);

export const BeforeAfterCard = ({ item }: { item: GalleryItem }) => (
  <div className="rounded-3xl overflow-hidden bg-card border border-border">
    <div className="grid grid-cols-2 gap-0.5 bg-border">
      <Photo src={item.before_url} label="Antes" variant="before" />
      <Photo src={item.after_url} label="Depois" variant="after" />
    </div>
    {item.caption && (
      <p className="px-4 py-3 font-body text-xs sm:text-sm text-muted-foreground text-center">{item.caption}</p>
    )}
  </div>
);

const ServiceGallery = ({ slug }: { slug: string }) => {
  const { items } = useServiceGallery(slug);
  if (items.length === 0) return null;
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 md:pb-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8 md:mb-10"
      >
        <p className="font-body text-primary text-xs tracking-[0.3em] uppercase font-semibold mb-2">Resultados</p>
        <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground">
          Antes e <span className="text-pink-vibrant">Depois</span>
        </h2>
      </motion.div>
      <div className="grid md:grid-cols-2 gap-5 md:gap-6">
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <BeforeAfterCard item={item} />
          </motion.div>
        ))}
      </div>
      <p className="mt-5 font-body text-[11px] text-muted-foreground text-center">
        Resultados podem variar de pessoa para pessoa.
      </p>
    </section>
  );
};

export default ServiceGallery;
