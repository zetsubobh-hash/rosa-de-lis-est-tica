import { motion } from "framer-motion";
import { useState, useCallback } from "react";
import { Send, CheckCircle, AlertCircle } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

// Simple math captcha
const generateCaptcha = () => {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { question: `${a} + ${b}`, answer: a + b };
};

const Contact = () => {
  const { settings } = useSiteSettings();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [captchaInput, setCaptchaInput] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const subjectOptions = [
    "Dúvidas sobre tratamentos",
    "Trabalhe conosco",
    "Seja nosso parceiro",
    "Sugestões ou reclamações",
    "Outro assunto",
  ];

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Informe seu nome";
    else if (formData.name.trim().length > 100) newErrors.name = "Nome muito longo";

    if (!formData.email.trim()) newErrors.email = "Informe seu e-mail";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim()))
      newErrors.email = "E-mail inválido";

    if (!formData.phone.trim()) newErrors.phone = "Informe seu telefone";

    if (!formData.message.trim()) newErrors.message = "Escreva sua mensagem";
    else if (formData.message.trim().length > 1000) newErrors.message = "Mensagem muito longa";

    if (!captchaInput.trim()) newErrors.captcha = "Responda a verificação";
    else if (parseInt(captchaInput) !== captcha.answer)
      newErrors.captcha = "Resposta incorreta";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, captchaInput, captcha.answer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus("sending");

    // Build WhatsApp message as fallback (no Resend key configured yet)
    const whatsappPhone = (settings.phone || "(31) 99588-2521").replace(/\D/g, "");
    const text = encodeURIComponent(
      `Olá! Meu nome é ${formData.name.trim()}.\n` +
      `E-mail: ${formData.email.trim()}\n` +
      `Telefone: ${formData.phone.trim()}\n` +
      (formData.subject ? `Assunto: ${formData.subject}\n` : "") +
      `\nMensagem: ${formData.message.trim()}`
    );

    window.open(`https://wa.me/55${whatsappPhone}?text=${text}`, "_blank");
    
    setStatus("success");
    setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    setCaptchaInput("");
    setCaptcha(generateCaptcha());

    setTimeout(() => setStatus("idle"), 5000);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-3 rounded-xl border font-body text-sm bg-background text-foreground placeholder:text-muted-foreground/60 outline-none transition-all duration-300 focus:ring-2 focus:ring-primary/30 ${
      errors[field] ? "border-destructive" : "border-border focus:border-primary"
    }`;

  return (
    <section id="contato" className="py-16 md:py-28 bg-rose-soft">
      <div className="max-w-6xl mx-auto px-5 md:px-6">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Left - Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="md:sticky md:top-32"
          >
            <p className="font-body text-primary text-xs md:text-sm tracking-[0.3em] uppercase mb-3 font-semibold">
              Contato
            </p>
            <h2 className="font-heading text-2xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
              Fale com a{" "}
              <span className="text-pink-vibrant">{settings.business_name || "Rosa de Lis"}</span>
            </h2>
            <p className="font-body text-muted-foreground text-sm md:text-base leading-relaxed mb-8">
              Tem dúvidas, quer trabalhar conosco ou ser nosso parceiro? 
              Preencha o formulário e retornaremos em breve. Ou fale pelo WhatsApp.
            </p>

            <motion.a
              href={`https://wa.me/55${(settings.phone || "31995882521").replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#25D366] text-white font-body text-sm font-semibold tracking-wider uppercase rounded-full hover:bg-[#20bd5a] transition-all duration-300"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </motion.a>

            {/* Info cards */}
            <div className="mt-10 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-sm">📍</span>
                </div>
                <div>
                  <p className="font-body text-foreground text-sm font-semibold">Endereço</p>
                  <p className="font-body text-muted-foreground text-sm">{settings.address || "R. Francisco Castro Monteiro, 46 - Sala 704 - Buritis, Belo Horizonte - MG"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-sm">📞</span>
                </div>
                <div>
                  <p className="font-body text-foreground text-sm font-semibold">Telefone</p>
                  <p className="font-body text-muted-foreground text-sm">{settings.phone || "(31) 99588-2521"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-sm">⏰</span>
                </div>
                <div>
                  <p className="font-body text-foreground text-sm font-semibold">Horário</p>
                  <p className="font-body text-muted-foreground text-sm">{settings.business_hours || "Seg a Sex: 8h às 20h | Sáb: 8h às 14h"}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right - Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <form
              onSubmit={handleSubmit}
              className="bg-background rounded-3xl p-6 md:p-8 shadow-lg border border-border"
            >
              <h3 className="font-heading text-lg md:text-xl font-bold text-foreground mb-6">
                Envie sua mensagem
              </h3>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="font-body text-xs font-semibold text-foreground mb-1.5 block uppercase tracking-wider">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Seu nome"
                    className={inputClass("name")}
                    maxLength={100}
                  />
                  {errors.name && (
                    <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.name}
                    </p>
                  )}
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-body text-xs font-semibold text-foreground mb-1.5 block uppercase tracking-wider">
                      E-mail
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="seu@email.com"
                      className={inputClass("email")}
                      maxLength={255}
                    />
                    {errors.email && (
                      <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="font-body text-xs font-semibold text-foreground mb-1.5 block uppercase tracking-wider">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="(11) 99999-9999"
                      className={inputClass("phone")}
                      maxLength={20}
                    />
                    {errors.phone && (
                      <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Subject select */}
                <div>
                  <label className="font-body text-xs font-semibold text-foreground mb-1.5 block uppercase tracking-wider">
                    Assunto
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => handleChange("subject", e.target.value)}
                    className={`${inputClass("subject")} appearance-none cursor-pointer`}
                  >
                    <option value="">Selecione o assunto</option>
                    {subjectOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="font-body text-xs font-semibold text-foreground mb-1.5 block uppercase tracking-wider">
                    Mensagem
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    placeholder="Conte-nos como podemos ajudar..."
                    rows={4}
                    className={`${inputClass("message")} resize-none`}
                    maxLength={1000}
                  />
                  {errors.message && (
                    <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.message}
                    </p>
                  )}
                </div>

                {/* Captcha */}
                <div className="bg-rose-soft rounded-xl p-4 border border-border">
                  <label className="font-body text-xs font-semibold text-foreground mb-2 block uppercase tracking-wider">
                    🛡️ Verificação — Não sou robô
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="font-heading text-lg font-bold text-foreground bg-background px-4 py-2 rounded-lg border border-border select-none">
                      {captcha.question} = ?
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={captchaInput}
                      onChange={(e) => {
                        setCaptchaInput(e.target.value);
                        if (errors.captcha) setErrors((prev) => ({ ...prev, captcha: "" }));
                      }}
                      placeholder="?"
                      className={`w-20 text-center ${inputClass("captcha")}`}
                      maxLength={3}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCaptcha(generateCaptcha());
                        setCaptchaInput("");
                      }}
                      className="text-muted-foreground hover:text-primary transition-colors text-xs font-body underline"
                    >
                      Trocar
                    </button>
                  </div>
                  {errors.captcha && (
                    <p className="text-destructive text-xs mt-2 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.captcha}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={status === "sending"}
                  className="w-full py-4 bg-primary text-primary-foreground font-body text-sm font-bold tracking-[0.15em] uppercase rounded-xl hover:bg-primary/90 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {status === "sending" ? (
                    "Enviando..."
                  ) : status === "success" ? (
                    <>
                      <CheckCircle size={18} /> Enviado com sucesso!
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Enviar mensagem
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
