import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const setMeta = (attr: string, attrValue: string, content: string) => {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const injectScript = (id: string, src: string) => {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
};

const injectInlineScript = (id: string, code: string) => {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.textContent = code;
  document.head.appendChild(s);
};

export const useSEO = () => {
  useEffect(() => {
    const apply = async () => {
      const { data } = await supabase
        .from("site_settings" as any)
        .select("key, value");

      if (!data) return;

      const m: Record<string, string> = {};
      (data as any[]).forEach((r) => { m[r.key] = r.value; });

      // Meta title
      if (m.seo_meta_title) {
        document.title = m.seo_meta_title;
        setMeta("property", "og:title", m.seo_meta_title);
        setMeta("name", "twitter:title", m.seo_meta_title);
      }

      // Meta description
      if (m.seo_meta_description) {
        setMeta("name", "description", m.seo_meta_description);
        setMeta("property", "og:description", m.seo_meta_description);
        setMeta("name", "twitter:description", m.seo_meta_description);
      }

      // OG Image
      if (m.seo_og_image) {
        setMeta("property", "og:image", m.seo_og_image);
        setMeta("name", "twitter:image", m.seo_og_image);
      }

      // Canonical URL
      if (m.seo_canonical_url) {
        setMeta("property", "og:url", m.seo_canonical_url);
        let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement("link");
          link.rel = "canonical";
          document.head.appendChild(link);
        }
        link.href = m.seo_canonical_url;
      }

      // Google Search Console verification
      if (m.seo_google_search_console) {
        setMeta("name", "google-site-verification", m.seo_google_search_console);
      }

      // Google Analytics 4
      if (m.seo_google_analytics_id) {
        const gaId = m.seo_google_analytics_id.trim();
        injectScript("ga-script", `https://www.googletagmanager.com/gtag/js?id=${gaId}`);
        injectInlineScript(
          "ga-init",
          `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`
        );
      }

      // Google Tag Manager
      if (m.seo_google_tag_manager) {
        const gtmId = m.seo_google_tag_manager.trim();
        injectInlineScript(
          "gtm-init",
          `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`
        );
      }

      // Facebook Pixel
      if (m.seo_facebook_pixel) {
        const fbId = m.seo_facebook_pixel.trim();
        injectInlineScript(
          "fb-pixel",
          `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fbId}');fbq('track','PageView');`
        );
      }
    };

    apply();
  }, []);
};
