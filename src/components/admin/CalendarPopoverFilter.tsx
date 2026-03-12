import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface CalendarPopoverFilterProps {
  date: Date;
  onSelect: (date: Date) => void;
  align?: "start" | "center" | "end";
}

const CalendarPopoverFilter = ({ date, onSelect, align = "end" }: CalendarPopoverFilterProps) => {
  const [open, setOpen] = useState(false);
  const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 px-3 text-xs font-body justify-start"
        >
          <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
          {format(normalizedDate, "dd/MM/yyyy")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="single"
          required
          month={normalizedDate}
          selected={normalizedDate}
          onSelect={(d) => {
            if (d) {
              onSelect(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
              setOpen(false);
            }
          }}
          locale={ptBR}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
};

export default CalendarPopoverFilter;
