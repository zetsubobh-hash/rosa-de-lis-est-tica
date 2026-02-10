const Footer = () => {
  return (
    <footer className="py-10 bg-card border-t border-border">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <p className="font-heading text-xl text-foreground mb-2">Rosa de Lis</p>
        <p className="font-body text-muted-foreground text-xs tracking-wider">
          © {new Date().getFullYear()} Rosa de Lis Estética. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
