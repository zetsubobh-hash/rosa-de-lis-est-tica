import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { services } from "@/data/services";

const Services = () => {
  return (
    <section id="servicos" className="py-20 md:py-28 bg-rose-soft">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <p className="font-body text-primary text-sm tracking-[0.3em] uppercase mb-3 font-semibold">
            Nossos Serviços
          </p>
          <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground">
            Tratamentos{" "}
            <span className="text-pink-vibrant">Estéticos Completos</span>
          </h2>
          <p className="font-body text-muted-foreground mt-4 max-w-2xl mx-auto text-sm md:text-lg leading-relaxed">
            Oferecemos uma linha completa de procedimentos estéticos faciais e corporais, sempre com foco no seu bem-estar e nos melhores resultados.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {services.map((service, i) => (
            <Link key={service.slug} to={`/servico/${service.slug}`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group relative bg-background rounded-2xl p-5 md:p-6 cursor-pointer overflow-hidden border border-transparent hover:border-primary/20 transition-all duration-500 hover:shadow-lg h-full"
              >
                {/* Decorative gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-pink-vibrant/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />

                <div className="relative z-10">
                  <div className="w-10 h-10 md:w-11 md:h-11 mb-4 flex items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary transition-all duration-500">
                    <service.icon
                      className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors duration-500"
                      strokeWidth={1.8}
                    />
                  </div>
                  <h3 className="font-heading text-sm md:text-base font-semibold text-foreground mb-2 leading-tight">
                    {service.title}
                  </h3>
                  <p className="font-body text-muted-foreground text-xs md:text-[13px] leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
                    {service.shortDescription}
                  </p>

                  {/* "Saiba mais" hint */}
                  <div className="mt-3 flex items-center gap-1 text-primary text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Saiba mais <ArrowRight className="w-3 h-3" />
                  </div>
                </div>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-primary to-pink-vibrant group-hover:w-3/4 transition-all duration-500 rounded-full" />
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
