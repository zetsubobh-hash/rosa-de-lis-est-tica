import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface CalendarPopoverFilterProps {
  date: Date;
  onSelect: (date: Date) => void;
  align?: "start" | "center" | "end";
}

const CalendarPopoverFilter = ({ date, onSelect, align = "end" }: CalendarPopoverFilterProps) => {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const handleSelect = (d: Date | undefined) => {
    if (d) {
      onSelect(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      setOpen(false);
    }
  };

  const trigger = (
    <Button
      variant="outline"
      className="h-9 px-3 text-xs font-body justify-start"
    >
      <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
      {format(normalizedDate, "dd/MM/yyyy")}
    </Button>
  );

  const calendar = (
    <Calendar
      mode="single"
      required
      month={normalizedDate}
      selected={normalizedDate}
      onSelect={handleSelect}
      locale={ptBR}
      className="p-3 pointer-events-auto"
    />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="pb-6">
          <div className="flex justify-center pt-2">
            {calendar}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        {calendar}
      </PopoverContent>
    </Popover>
  );
};

export default CalendarPopoverFilter;
